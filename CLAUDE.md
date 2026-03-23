# CLAUDE.md — TaskPilot Desktop

> This file gives Claude Code full context about the desktop application. Read it entirely before making any changes.

---

## Project Overview

TaskPilot Desktop is an **Electron application** that brings the TaskPilot web experience to the desktop with native capabilities. It combines the visual dashboard UI from the web app with full local filesystem access (like the CLI) and cloud storage workspace support.

### Key Advantage Over CLI

The Claude Agent SDK always injects built-in tools (Bash, Read, Write) that cannot be disabled. In Electron's main process, we can run the **generic agent loop** (same as the web app's cloud mode) with full control over the tool set. This means cloud storage workspaces (Google Drive, OneDrive) work properly from the desktop app.

### Key Advantage Over Web App

The desktop app has native filesystem access via Node.js in the main process. Users can pick a local directory with the native OS folder picker and the agent works on their local files directly — no cloud mode needed for code.

---

## Related Projects

| Project | Location | Description |
|---------|----------|-------------|
| **Backend + Web App** | `/home/joshjal/Projects/personal/claude-trello` | TanStack Start full-stack app, API routes, AI session logic |
| **Frontend (landing)** | `/home/joshjal/Projects/personal/claude-trello-frontend` | Separate frontend/marketing site |
| **CLI** | `/home/joshjal/Projects/personal/claude-trello/cli` | npm package `@joshjal/taskpilot` |
| **Desktop App** (this repo) | `/home/joshjal/Projects/personal/taskpilot-desktop` | Electron app for Windows/Mac/Linux |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | **Electron** |
| Build Tool | **electron-vite** (Vite for main + preload + renderer) |
| Renderer | **React 19** + **TanStack Query** |
| Styling | **Tailwind CSS v4** |
| Icons | **Lucide React** |
| Local Storage | **electron-store** (encrypted) |
| AI (Local) | **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) |
| AI (Cloud) | **Anthropic SDK** (`@anthropic-ai/sdk`) for generic agent loop |
| Packaging | **electron-builder** |
| Auto-Update | **electron-updater** via GitHub Releases |
| Language | **TypeScript** (strict mode) |

---

## Architecture

```
Renderer (React)           Preload (IPC bridge)           Main Process (Node.js)
┌─────────────────┐       ┌──────────────────┐           ┌─────────────────────┐
│ Components       │       │ contextBridge     │           │ IPC Handlers         │
│ - LoginPage      │◄─────►│ window.taskpilot  │◄─────────►│ - auth               │
│ - Dashboard      │  IPC  │                  │   IPC     │ - data (API calls)   │
│ - SessionLog     │       └──────────────────┘           │ - session runner     │
│ - BoardPanel     │                                      │ - workspace (FS/API) │
│ - WorkspacePicker│                                      │ - settings (store)   │
└─────────────────┘                                      └─────────────────────┘
```

### Session Modes

| Mode | Workspace | Agent Execution | Tool Set |
|------|-----------|----------------|----------|
| **Local** | Local directory (cwd) | Claude Agent SDK | Built-in Claude tools + MCP task source tools |
| **Cloud (Repos)** | GitHub repo / GitLab project | Generic agent loop | Web coding tools + task source tools |
| **Cloud (Storage)** | Google Drive / OneDrive folder | Generic agent loop | Storage tools + task source tools |

---

## Repository Structure

```
taskpilot-desktop/
├── CLAUDE.md                      ← You are here
├── PROGRESS.md                    ← Phase completion tracking
├── package.json
├── tsconfig.json
├── electron-vite.config.ts
├── electron-builder.yml
├── src/
│   ├── main/                      ← Electron main process (Node.js)
│   │   ├── index.ts               ← App entry, window creation
│   │   ├── ipc.ts                 ← IPC handlers (renderer ↔ main)
│   │   ├── api.ts                 ← HTTP client for TaskPilot server API
│   │   ├── store.ts               ← electron-store for settings/cookies
│   │   ├── session-runner.ts      ← Agent session launcher (TODO)
│   │   ├── providers/             ← AI provider adapters (TODO)
│   │   ├── google/                ← Google Drive client (TODO — copy from web app)
│   │   └── onedrive/              ← OneDrive client (TODO — copy from web app)
│   ├── preload/
│   │   └── index.ts               ← IPC bridge — exposes window.taskpilot
│   └── renderer/                  ← Electron renderer (React)
│       ├── index.html
│       ├── main.tsx               ← React entry
│       ├── App.tsx                ← Root component (auth gate)
│       ├── components/
│       │   ├── LoginPage.tsx      ← Email/password login
│       │   └── Dashboard.tsx      ← Main dashboard (scaffold)
│       ├── hooks/                 ← React hooks (TODO — adapt from web app)
│       └── styles/
│           └── globals.css        ← Tailwind + CSS variables (matches web app)
├── resources/
│   ├── icon.png                   ← App icon (TODO)
│   ├── icon.icns                  ← Mac icon (TODO)
│   └── icon.ico                   ← Windows icon (TODO)
└── dist/                          ← Build output (gitignored)
```

---

## Shared Code from Web App

These modules are copied from the web app (`/home/joshjal/Projects/personal/claude-trello`). When updating these, update both locations.

| Desktop Location | Web App Source | Purpose |
|-----------------|---------------|---------|
| `src/main/google/` | `src/lib/google/` | Google Drive/Docs/Sheets API client |
| `src/main/onedrive/` | `src/lib/onedrive/` | OneDrive/Excel API client |
| `src/main/providers/storage-tools.ts` | `src/lib/providers/storage-tools.ts` | Cloud storage tool set |
| `src/renderer/styles/globals.css` | CSS variables | Theme colors and design tokens |

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev (hot reload)
npm run dev

# Type check
npm run typecheck

# Build for current platform
npm run build

# Package installer for current platform
npm run package

# Package for specific platforms
npm run package:win
npm run package:mac
npm run package:linux
```

---

## IPC Protocol

All communication between renderer and main process goes through `window.taskpilot`:

| Method | Direction | Purpose |
|--------|-----------|---------|
| `login(email, password)` | Renderer → Main | Authenticate against server |
| `logout()` | Renderer → Main | Clear session |
| `getSession()` | Renderer → Main | Check current auth state |
| `getIntegrationStatus()` | Renderer → Main | Get connected sources/providers |
| `getBoards()` | Renderer → Main | List Trello boards |
| `getBoardData(boardId)` | Renderer → Main | Get cards for a board |
| `selectDirectory()` | Renderer → Main | Native OS folder picker |
| `startSession(config)` | Renderer → Main | Launch AI agent session |
| `stopSession()` | Renderer → Main | Abort running session |
| `onSessionEvent(callback)` | Main → Renderer | Stream session events |

---

## Documentation Requirements

When adding or changing user-visible features, update all relevant documentation surfaces:

1. **This repo** — CLAUDE.md and PROGRESS.md
2. **Web app** (`/home/joshjal/Projects/personal/claude-trello`) — CLAUDE.md, web docs, CLI docs, roadmap, updates.ts
3. **Frontend** (`/home/joshjal/Projects/personal/claude-trello-frontend`) — landing page sections, CLI docs
4. **CLI** (`/home/joshjal/Projects/personal/claude-trello/cli`) — README.md

Not every change touches all four — use judgement based on what's affected.

---

## Auto-Update (Phase 22k) — Implementation Plan

### Overview

Use `electron-updater` (already installed) to check GitHub Releases for new versions, download updates in the background, and prompt the user to restart. AppImage is the only Linux target that supports auto-update; `.deb` users get an in-app banner with a download link.

### Platform Support

| Platform | Format | Auto-update? | Mechanism |
|----------|--------|--------------|-----------|
| Windows | NSIS `.exe` | Yes | Downloads + installs on quit |
| macOS | DMG | Yes | Downloads + installs on quit (code signing recommended) |
| Linux | AppImage | Yes | Replaces AppImage file in-place |
| Linux | deb | No | In-app banner with download link to GitHub Release |

### Implementation Steps

1. **`src/main/updater.ts`** — Auto-updater module
   - Import `autoUpdater` from `electron-updater`
   - Configure logging via `electron-log`
   - Check for updates on app launch and on a periodic interval (every 4 hours)
   - Emit IPC events to renderer for update state: `checking`, `available`, `not-available`, `downloaded`, `error`
   - On `update-downloaded`, notify renderer so it can show a restart prompt
   - Expose `quitAndInstall()` via IPC so renderer can trigger restart

2. **`src/main/index.ts`** — Wire up updater
   - Call `initAutoUpdater(mainWindow)` after window creation
   - Skip in dev mode (`!app.isPackaged`)

3. **`src/preload/index.ts`** — IPC bridge additions
   - `onUpdateEvent(callback)` — listen for update state changes from main
   - `installUpdate()` — trigger quit-and-install
   - `checkForUpdates()` — manual check from settings page
   - `getUpdateStatus()` — get current update state

4. **`src/renderer/components/UpdateNotification.tsx`** — UI component
   - Subtle banner/toast when an update is downloaded
   - "Restart Now" and "Later" buttons
   - For `.deb` users: "Download Latest" link to GitHub Releases page

5. **CI publish step** — Update GitHub Actions
   - Add `--publish always` (or `onTag`) to `electron-builder` in CI
   - Ensures `latest.yml` / `latest-linux.yml` / `latest-mac.yml` are uploaded to the GitHub Release

6. **Dependencies**
   - Add `electron-log` for persistent update logging

### IPC Additions

| Method | Direction | Purpose |
|--------|-----------|---------|
| `onUpdateEvent(callback)` | Main → Renderer | Stream update lifecycle events |
| `installUpdate()` | Renderer → Main | Trigger quit-and-install |
| `checkForUpdates()` | Renderer → Main | Manual update check |
| `getUpdateStatus()` | Renderer → Main | Get current update state |

---

## Code Style

- **TypeScript strict mode**. No `any`. Use `unknown` + type guards.
- **No default exports** except React components.
- Component files: PascalCase. Utility files: camelCase.
- CSS variables match the web app's design system exactly.
- Use `window.taskpilot.*` IPC calls in the renderer — never use `fetch()` directly.
