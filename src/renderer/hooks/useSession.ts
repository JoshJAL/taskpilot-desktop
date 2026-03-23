import { useState, useCallback, useRef, useEffect } from "react";
import type { BoardData, SessionLogEntry, AiProviderId } from "../types";
import { useToast } from "../components/Toast";

interface PrResult {
  url: string;
  number: number;
  title: string;
  draft: boolean;
}

interface SessionEvent {
  type: string;
  content?: string;
  message?: { content?: unknown };
  raw?: { message?: { content?: unknown } };
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
  model?: string;
  subtype?: string;
  result?: string;
  url?: string;
  number?: number;
  title?: string;
  draft?: boolean;
}

export function useSession() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<SessionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [prResult, setPrResult] = useState<PrResult | null>(null);
  const idCounter = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const addLog = useCallback((type: string, content: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: idCounter.current++,
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;

  // Stable event handler that uses refs to avoid stale closures
  const handleEvent = useCallback(
    (raw: unknown) => {
      const message = raw as SessionEvent;
      const log = addLogRef.current;
      const showToast = toastRef.current;

      if (message.type === "pr_created") {
        const statusLabel = message.draft ? "draft" : "open";
        log("pr", `PR #${message.number} created (${statusLabel}): ${message.url}`);
        setPrResult({
          url: message.url as string,
          number: message.number as number,
          title: message.title as string,
          draft: message.draft as boolean,
        });
        return;
      }

      if (message.type === "done") {
        log("system", "Session complete");
        showToast("success", "Session completed successfully");
        setIsRunning(false);
        setPendingQuestion(null);
        return;
      }

      if (message.type === "error") {
        const errMsg = message.error ?? message.content ?? "Unknown error";
        setError(errMsg);
        log("error", errMsg);
        showToast("error", `Session failed: ${errMsg}`);
        setIsRunning(false);
        setPendingQuestion(null);
        return;
      }

      if (message.type === "assistant") {
        if (typeof message.content === "string") {
          log("assistant", message.content);
        }
        const content = message.message?.content ?? message.raw?.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              log("assistant", block.text);
            } else if (block.type === "tool_use") {
              if (block.name === "AskUserQuestion") {
                const questions = block.input?.questions;
                if (Array.isArray(questions) && questions.length > 0) {
                  const questionText = questions
                    .map((q: { question: string }) => q.question)
                    .join("\n");
                  log("question", questionText);
                  setPendingQuestion(questionText);
                }
              } else {
                log(
                  "tool",
                  `Using tool: ${block.name}(${JSON.stringify(block.input ?? {})})`,
                );
              }
            }
          }
        }
      } else if (message.type === "tool_use") {
        log(
          "tool",
          `Using tool: ${message.toolName}(${JSON.stringify(message.toolInput ?? {})})`,
        );
      } else if (message.type === "tool_result") {
        const result = message.toolResult ?? "";
        const truncated =
          result.length > 200 ? result.slice(0, 200) + "..." : result;
        log("result", `[${message.toolName}] ${truncated}`);
      } else if (message.type === "result") {
        log("result", `Session finished: ${message.result ?? message.subtype}`);
      } else if (message.type === "system" && message.subtype === "init") {
        log("system", `Session started (model: ${message.model})`);
      }
    },
    [], // stable — uses refs internally
  );

  // Always listen for session events (connect once, stay connected)
  useEffect(() => {
    const cleanup = window.taskpilot.onSessionEvent(handleEvent);
    cleanupRef.current = cleanup;

    return () => {
      cleanup();
      cleanupRef.current = null;
    };
  }, [handleEvent]);

  const start = useCallback(
    async (
      boardData: BoardData,
      options: {
        cwd?: string;
        userMessage?: string;
        providerId?: AiProviderId;
        source?: "trello" | "github" | "gitlab";
        mode?: "sequential" | "parallel";
        maxConcurrency?: number;
        webMode?: boolean;
        githubOwner?: string;
        githubRepo?: string;
        gitlabProjectId?: number;
        selectedBranch?: string;
        workspaceProvider?: "google" | "onedrive";
        workspaceFolderId?: string;
      } = {},
    ) => {
      setIsRunning(true);
      setError(null);
      setLogs([]);
      setPendingQuestion(null);
      setPrResult(null);
      idCounter.current = 0;

      try {
        await window.taskpilot.startSession({
          boardData,
          ...options,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start session";
        setError(msg);
        addLog("error", msg);
        setIsRunning(false);
      }
    },
    [addLog],
  );

  const stop = useCallback(async () => {
    try {
      await window.taskpilot.stopSession();
    } catch {
      // Best effort
    }
    setIsRunning(false);
    setPendingQuestion(null);
    addLog("system", "Session stopped");
    toast("info", "Session stopped");
  }, [addLog, toast]);

  const sendUserMessage = useCallback(
    async (message: string) => {
      setPendingQuestion(null);
      addLog("user", message);

      try {
        await window.taskpilot.sendMessage(message);
      } catch {
        addLog("error", "Failed to send message");
      }
    },
    [addLog],
  );

  return { isRunning, logs, error, pendingQuestion, prResult, start, stop, sendMessage: sendUserMessage };
}
