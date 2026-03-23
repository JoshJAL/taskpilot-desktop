import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Auth
  login: (email: string, password: string) =>
    ipcRenderer.invoke("auth:login", email, password),
  logout: () => ipcRenderer.invoke("auth:logout"),
  getSession: () => ipcRenderer.invoke("auth:session"),

  // Data
  getIntegrationStatus: () => ipcRenderer.invoke("data:status"),
  getBoards: () => ipcRenderer.invoke("data:boards"),
  getBoardData: (boardId: string) => ipcRenderer.invoke("data:boardData", boardId),
  checkItem: (cardId: string, checkItemId: string, state: string) =>
    ipcRenderer.invoke("data:checkItem", { cardId, checkItemId, state }),
  moveCard: (cardId: string, listId: string) =>
    ipcRenderer.invoke("data:moveCard", cardId, listId),
  getGitHubRepos: () => ipcRenderer.invoke("data:githubRepos"),
  getGitHubIssues: (owner: string, repo: string) =>
    ipcRenderer.invoke("data:githubIssues", owner, repo),
  getGitLabProjects: () => ipcRenderer.invoke("data:gitlabProjects"),
  getGitLabIssues: (projectId: number) =>
    ipcRenderer.invoke("data:gitlabIssues", projectId),

  // Workspace
  selectDirectory: () => ipcRenderer.invoke("workspace:selectDirectory"),
  getGoogleFolders: (parentId: string) =>
    ipcRenderer.invoke("workspace:googleFolders", parentId),
  getOneDriveFolders: (parentId: string) =>
    ipcRenderer.invoke("workspace:onedriveFolders", parentId),
  getGoogleFiles: (folderId: string) =>
    ipcRenderer.invoke("workspace:googleFiles", folderId),
  getOneDriveFiles: (folderId: string) =>
    ipcRenderer.invoke("workspace:onedriveFiles", folderId),

  // Sessions
  startSession: (config: Record<string, unknown>) =>
    ipcRenderer.invoke("session:start", config),
  stopSession: () => ipcRenderer.invoke("session:stop"),
  sendMessage: (message: string) =>
    ipcRenderer.invoke("session:sendMessage", message),
  onSessionEvent: (callback: (event: unknown) => void) => {
    const handler = (_e: unknown, event: unknown) => callback(event);
    ipcRenderer.on("session:event", handler);
    return () => ipcRenderer.removeListener("session:event", handler);
  },

  // Session History
  getSessions: (query: Record<string, string | number | undefined>) =>
    ipcRenderer.invoke("sessions:list", query),
  getSessionDetail: (sessionId: string) =>
    ipcRenderer.invoke("sessions:detail", sessionId),
  getSessionEvents: (sessionId: string, limit: number, offset: number) =>
    ipcRenderer.invoke("sessions:events", sessionId, limit, offset),
  deleteSession: (sessionId: string) =>
    ipcRenderer.invoke("sessions:delete", sessionId),

  // OAuth / Integrations
  oauthAuthorize: (provider: string) =>
    ipcRenderer.invoke("oauth:authorize", provider),
  oauthDisconnect: (provider: string) =>
    ipcRenderer.invoke("oauth:disconnect", provider),
  openExternal: (url: string) =>
    ipcRenderer.invoke("shell:openExternal", url),

  // API Keys
  saveApiKey: (apiKey: string, providerId: string) =>
    ipcRenderer.invoke("settings:saveApiKey", apiKey, providerId),
  deleteApiKey: (providerId: string) =>
    ipcRenderer.invoke("settings:deleteApiKey", providerId),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke("settings:update", settings),
};

contextBridge.exposeInMainWorld("taskpilot", api);

export type TaskPilotAPI = typeof api;
