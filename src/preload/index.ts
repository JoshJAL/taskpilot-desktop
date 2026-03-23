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
  getGitHubRepos: () => ipcRenderer.invoke("data:githubRepos"),
  getGitLabProjects: () => ipcRenderer.invoke("data:gitlabProjects"),

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
  onSessionEvent: (callback: (event: unknown) => void) => {
    const handler = (_e: unknown, event: unknown) => callback(event);
    ipcRenderer.on("session:event", handler);
    return () => ipcRenderer.removeListener("session:event", handler);
  },

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke("settings:update", settings),
};

contextBridge.exposeInMainWorld("taskpilot", api);

export type TaskPilotAPI = typeof api;
