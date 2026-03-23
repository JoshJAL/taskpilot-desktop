import { app, BrowserWindow, Menu, shell, nativeImage } from "electron";
import { join } from "path";
import { registerIpcHandlers } from "./ipc";

// Fix GPU crashes on Linux (Wayland/EGL issues)
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = join(app.getAppPath(), "resources", "icon.png");
  const icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    console.error("WARNING: App icon failed to load from:", iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "TaskPilot",
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Set dock icon (macOS) and force window icon (Linux)
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }
  mainWindow.setIcon(icon);

  // Remove the menu bar entirely
  Menu.setApplicationMenu(null);

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
