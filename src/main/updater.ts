import { autoUpdater, UpdateInfo } from "electron-updater";
import { BrowserWindow } from "electron";
import { ipcMain } from "electron";
import log from "electron-log";

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string; releaseNotes: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

let currentStatus: UpdateStatus = { state: "idle" };
let mainWindowRef: BrowserWindow | null = null;

function sendStatus(status: UpdateStatus): void {
  currentStatus = status;
  mainWindowRef?.webContents.send("update:event", status);
}

function extractReleaseNotes(info: UpdateInfo): string {
  if (!info.releaseNotes) return "";
  if (typeof info.releaseNotes === "string") return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes.map((n) => (typeof n === "string" ? n : n.note || "")).join("\n");
  }
  return "";
}

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  // Route updater logs through electron-log
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // --- Events ---
  autoUpdater.on("checking-for-update", () => {
    sendStatus({ state: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    sendStatus({
      state: "available",
      version: info.version,
      releaseNotes: extractReleaseNotes(info),
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus({ state: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus({ state: "downloading", percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    sendStatus({ state: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (err: Error) => {
    log.error("Auto-updater error:", err);
    sendStatus({ state: "error", message: err.message });
  });

  // --- IPC handlers ---
  ipcMain.handle("update:check", () => {
    return autoUpdater.checkForUpdatesAndNotify();
  });

  ipcMain.handle("update:install", () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("update:status", () => {
    return currentStatus;
  });

  // --- Initial check + periodic checks (every 4 hours) ---
  autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
    log.error("Initial update check failed:", err);
  });

  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
      log.error("Periodic update check failed:", err);
    });
  }, FOUR_HOURS);
}
