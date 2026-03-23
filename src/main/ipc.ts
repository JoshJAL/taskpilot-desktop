import { ipcMain, dialog } from "electron";
import { apiFetch } from "./api";
import { store, getSessionCookie, setSessionCookie, getServerUrl } from "./store";

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

  ipcMain.handle("data:githubRepos", async () => {
    return apiFetch("/api/github/repos");
  });

  ipcMain.handle("data:gitlabProjects", async () => {
    return apiFetch("/api/gitlab/projects");
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
