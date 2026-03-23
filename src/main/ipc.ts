import { ipcMain, dialog, shell } from "electron";
import { apiFetch } from "./api";
import { store, getSessionCookie, setSessionCookie, getServerUrl } from "./store";
import { startSession, stopSession, sendMessage } from "./session-runner";
import type { SessionStartConfig } from "./types";

export function registerIpcHandlers() {
  // ── Auth ──────────────────────────────────────────────────────────────

  ipcMain.handle("auth:login", async (_event, email: string, password: string) => {
    const serverUrl = getServerUrl();
    const res = await fetch(`${serverUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": serverUrl,
        "Referer": serverUrl,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? "Login failed");
    }

    // Extract and store the session cookie
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      setSessionCookie(setCookie.split(";")[0]);
    }

    return res.json();
  });

  ipcMain.handle("auth:register", async (_event, name: string, email: string, password: string) => {
    const serverUrl = getServerUrl();
    const res = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": serverUrl,
        "Referer": serverUrl,
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? "Registration failed");
    }

    // Extract and store the session cookie
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      setSessionCookie(setCookie.split(";")[0]);
    }

    return res.json();
  });

  ipcMain.handle("auth:logout", async () => {
    setSessionCookie(null);
    return { success: true };
  });

  ipcMain.handle("auth:session", async () => {
    const cookie = getSessionCookie();
    if (!cookie) return null;

    try {
      return await apiFetch("/api/auth/get-session");
    } catch {
      return null;
    }
  });

  // ── Data ──────────────────────────────────────────────────────────────

  ipcMain.handle("data:status", async () => {
    return apiFetch("/api/settings/status");
  });

  ipcMain.handle("data:boards", async () => {
    return apiFetch("/api/trello/boards");
  });

  ipcMain.handle("data:boardData", async (_event, boardId: string) => {
    return apiFetch(`/api/trello/cards?boardId=${boardId}`);
  });

  ipcMain.handle("data:checkItem", async (_event, params: { cardId: string; checkItemId: string; state: string }) => {
    return apiFetch("/api/trello/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  });

  ipcMain.handle("data:moveCard", async (_event, cardId: string, listId: string) => {
    return apiFetch("/api/trello/move-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, listId }),
    });
  });

  ipcMain.handle("data:githubRepos", async () => {
    return apiFetch("/api/github/repos");
  });

  ipcMain.handle("data:githubIssues", async (_event, owner: string, repo: string) => {
    return apiFetch(`/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
  });

  ipcMain.handle("data:gitlabProjects", async () => {
    return apiFetch("/api/gitlab/projects");
  });

  ipcMain.handle("data:gitlabIssues", async (_event, projectId: number) => {
    return apiFetch(`/api/gitlab/issues?projectId=${projectId}`);
  });

  // ── Workspace ─────────────────────────────────────────────────────────

  ipcMain.handle("workspace:selectDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select project directory",
    });
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("workspace:googleFolders", async (_event, parentId: string) => {
    return apiFetch(`/api/google/folders?parentId=${encodeURIComponent(parentId)}`);
  });

  ipcMain.handle("workspace:onedriveFolders", async (_event, parentId: string) => {
    return apiFetch(`/api/onedrive/folders?parentId=${encodeURIComponent(parentId)}`);
  });

  ipcMain.handle("workspace:googleFiles", async (_event, folderId: string) => {
    return apiFetch(`/api/google/files?folderId=${encodeURIComponent(folderId)}`);
  });

  ipcMain.handle("workspace:onedriveFiles", async (_event, folderId: string) => {
    return apiFetch(`/api/onedrive/files?folderId=${encodeURIComponent(folderId)}`);
  });

  // ── Sessions ──────────────────────────────────────────────────────────

  ipcMain.handle("session:start", async (_event, config: SessionStartConfig) => {
    // Fire-and-forget: startSession runs async and streams events via IPC
    startSession(config).catch(() => {
      // Errors are already sent as session:event
    });
    return { success: true };
  });

  ipcMain.handle("session:stop", async () => {
    stopSession();
    return { success: true };
  });

  ipcMain.handle("session:sendMessage", async (_event, message: string) => {
    await sendMessage(message);
    return { success: true };
  });

  // ── Credentials (for local mode) ─────────────────────────────────────

  ipcMain.handle("data:credentials", async (_event, providerId: string, source: string, workspaceProvider?: string) => {
    const params = new URLSearchParams({ providerId, source });
    if (workspaceProvider) params.set("workspaceProvider", workspaceProvider);
    return apiFetch(`/api/cli/credentials?${params.toString()}`);
  });

  // ── Session History ──────────────────────────────────────────────────

  ipcMain.handle("sessions:list", async (_event, query: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (query.source) params.set("source", String(query.source));
    if (query.status) params.set("status", String(query.status));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));
    if (query.sort) params.set("sort", String(query.sort));
    return apiFetch(`/api/sessions?${params.toString()}`);
  });

  ipcMain.handle("sessions:detail", async (_event, sessionId: string) => {
    return apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  });

  ipcMain.handle("sessions:events", async (_event, sessionId: string, limit: number, offset: number) => {
    return apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/events?limit=${limit}&offset=${offset}`);
  });

  ipcMain.handle("sessions:delete", async (_event, sessionId: string) => {
    return apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  });

  // ── OAuth / Integrations ─────────────────────────────────────────────

  ipcMain.handle("oauth:authorize", async (_event, provider: string) => {
    const data = await apiFetch<{ url: string }>(`/api/${provider}/authorize`);
    return data;
  });

  ipcMain.handle("oauth:disconnect", async (_event, provider: string) => {
    return apiFetch(`/api/${provider}/connect`, { method: "DELETE" });
  });

  ipcMain.handle("shell:openExternal", async (_event, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  // ── API Keys ────────────────────────────────────────────────────────

  ipcMain.handle("settings:saveApiKey", async (_event, apiKey: string, providerId: string) => {
    return apiFetch("/api/settings/apikey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, providerId }),
    });
  });

  ipcMain.handle("settings:deleteApiKey", async (_event, providerId: string) => {
    return apiFetch(`/api/settings/apikey?providerId=${encodeURIComponent(providerId)}`, {
      method: "DELETE",
    });
  });

  // ── Settings ──────────────────────────────────────────────────────────

  ipcMain.handle("settings:get", () => {
    return {
      serverUrl: store.get("serverUrl"),
      theme: store.get("theme"),
      sidebarCollapsed: store.get("sidebarCollapsed"),
    };
  });

  ipcMain.handle("settings:update", (_event, settings: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof typeof settings, value);
    }
    return { success: true };
  });
}
