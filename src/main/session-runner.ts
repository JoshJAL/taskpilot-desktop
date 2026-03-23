import { Readable } from "node:stream";
import { Notification } from "electron";
import { getMainWindow } from "./index";
import { apiFetch } from "./api";
import { getServerUrl, getSessionCookie } from "./store";
import { runLocalSession } from "./local-runner";
import type { SessionStartConfig, SessionEvent } from "./types";

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.on("click", () => {
      const win = getMainWindow();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    });
    notification.show();
  }
}

let activeAbortController: AbortController | null = null;

export async function startSession(config: SessionStartConfig): Promise<void> {
  if (activeAbortController) {
    throw new Error("A session is already active");
  }

  const abortController = new AbortController();
  activeAbortController = abortController;

  const isLocalMode = !config.webMode && !!config.cwd;

  try {
    if (isLocalMode) {
      await startLocalSession(config);
    } else {
      await startServerSession(config, abortController);
    }
  } finally {
    activeAbortController = null;
  }
}

// ── Local Mode: Claude Agent SDK in main process ──────────────────────────

async function startLocalSession(config: SessionStartConfig): Promise<void> {
  const mainWindow = getMainWindow();

  function emit(event: SessionEvent) {
    mainWindow?.webContents.send("session:event", event);
  }

  try {
    // Fetch credentials from the server (decrypted API key + tokens)
    const source = config.source ?? "trello";
    const providerId = config.providerId ?? "claude";
    const credentials = await apiFetch<{
      anthropicApiKey: string;
      trelloApiKey: string;
      trelloToken: string;
      providerId: string;
      githubToken?: string;
      gitlabToken?: string;
      googleToken?: string;
      onedriveToken?: string;
    }>(`/api/cli/credentials?providerId=${providerId}&source=${source}`);

    await runLocalSession(config, credentials);
    showNotification("Session Complete", "Your AI agent session has finished successfully.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Local session failed";
    emit({ type: "error", error: msg });
    showNotification("Session Failed", msg);
  }
}

// ── Cloud Mode: Proxy through server SSE ──────────────────────────────────

async function startServerSession(
  config: SessionStartConfig,
  abortController: AbortController,
): Promise<void> {
  const mainWindow = getMainWindow();

  function emit(event: SessionEvent) {
    mainWindow?.webContents.send("session:event", event);
  }

  try {
    const serverUrl = getServerUrl();
    const cookie = getSessionCookie();

    const res = await fetch(`${serverUrl}/api/claude/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: serverUrl,
        Referer: serverUrl,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        boardData: config.boardData,
        cwd: config.cwd,
        userMessage: config.userMessage,
        providerId: config.providerId,
        source: config.source,
        mode: config.mode,
        maxConcurrency: config.maxConcurrency,
        webMode: true,
        githubOwner: config.githubOwner,
        githubRepo: config.githubRepo,
        gitlabProjectId: config.gitlabProjectId,
        selectedBranch: config.selectedBranch,
        workspaceProvider: config.workspaceProvider,
        workspaceFolderId: config.workspaceFolderId,
      }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }

    if (!res.body) {
      throw new Error("No response stream");
    }

    const nodeStream = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of nodeStream) {
      if (abortController.signal.aborted) break;

      buffer += decoder.decode(chunk as Buffer, { stream: true });
      const segments = buffer.split("\n\n");
      buffer = segments.pop() ?? "";

      for (const segment of segments) {
        const trimmed = segment.trim();
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const event = JSON.parse(trimmed.slice(6)) as SessionEvent;
          emit(event);

          if (event.type === "done") {
            showNotification("Session Complete", "Your AI agent session has finished successfully.");
            return;
          }
          if (event.type === "error") {
            showNotification("Session Failed", event.error ?? "The session encountered an error.");
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    emit({ type: "done" });
    showNotification("Session Complete", "Your AI agent session has finished successfully.");
  } catch (err) {
    if (!abortController.signal.aborted) {
      const msg = err instanceof Error ? err.message : "Session failed";
      emit({ type: "error", error: msg });
      showNotification("Session Failed", msg);
    }
  }
}

export async function sendMessage(message: string): Promise<void> {
  const serverUrl = getServerUrl();
  const cookie = getSessionCookie();

  const res = await fetch(`${serverUrl}/api/claude/session`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Origin: serverUrl,
      Referer: serverUrl,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to send message");
  }
}

export function stopSession(): void {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  // Also tell the server to stop (for cloud mode sessions)
  const serverUrl = getServerUrl();
  const cookie = getSessionCookie();

  fetch(`${serverUrl}/api/claude/session`, {
    method: "DELETE",
    headers: {
      Origin: serverUrl,
      Referer: serverUrl,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  }).catch(() => {
    // Best effort
  });
}

export function isSessionActive(): boolean {
  return activeAbortController !== null;
}
