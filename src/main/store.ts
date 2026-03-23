import Store from "electron-store";

interface StoreSchema {
  serverUrl: string;
  sessionCookie: string | null;
  theme: "light" | "dark" | "auto";
  sidebarCollapsed: boolean;
}

export const store = new Store<StoreSchema>({
  defaults: {
    serverUrl: "https://account.task-pilot.dev",
    sessionCookie: null,
    theme: "auto",
    sidebarCollapsed: false,
  },
  encryptionKey: "taskpilot-desktop-store-key",
});

export function getServerUrl(): string {
  return store.get("serverUrl");
}

export function getSessionCookie(): string | null {
  return store.get("sessionCookie");
}

export function setSessionCookie(cookie: string | null): void {
  store.set("sessionCookie", cookie);
}
