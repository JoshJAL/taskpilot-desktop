# PROGRESS.md — TaskPilot Desktop

Tracks implementation progress for the desktop application (Phase 22 from the main project).

---

## Phase 22a: Project Scaffold
**Status: Complete**

- [x] Electron + electron-vite + React + TypeScript setup
- [x] Main process entry with window creation
- [x] Preload script with IPC bridge (`window.taskpilot`)
- [x] Renderer with React 19 + TanStack Query
- [x] Tailwind CSS with matching design tokens from web app
- [x] electron-builder config for Win/Mac/Linux
- [x] CLAUDE.md and PROGRESS.md

## Phase 22b: Auth & Data Layer
**Status: Complete**

- [x] Login page (email/password)
- [x] Session cookie storage via electron-store (encrypted)
- [x] IPC handlers for auth (login, logout, getSession)
- [x] IPC handlers for data (boards, repos, projects, status)
- [x] API client with cookie-based auth
- [x] Server URL configuration

## Phase 22c: Local Mode
**Status: Not started**

- [ ] Native directory picker integration
- [ ] Claude Agent SDK session runner in main process
- [ ] SSE-like event streaming via IPC (`session:event`)
- [ ] Session start/stop IPC handlers
- [ ] MCP server for Trello/GitHub/GitLab task tools

## Phase 22d: UI Port
**Status: Not started**

- [ ] Sidebar navigation (adapted from web app)
- [ ] Board selector / repo selector / project selector
- [ ] SessionControls with mode/provider/workspace selection
- [ ] SessionLog component
- [ ] BoardPanel with card list
- [ ] ParallelSessionView
- [ ] Toast notifications
- [ ] Theme toggle (synced with electron-store)

## Phase 22e: Cloud Mode (Repos)
**Status: Not started**

- [ ] Generic agent loop in main process
- [ ] GitHub web mode tools (read/write/edit via API)
- [ ] GitLab web mode tools
- [ ] Branch selection

## Phase 22f: Cloud Mode (Storage)
**Status: Not started**

- [ ] Copy Google Drive client from web app
- [ ] Copy OneDrive client from web app
- [ ] Storage tool set in main process
- [ ] Google Docs support
- [ ] Google Sheets support
- [ ] Excel support

## Phase 22g: Settings
**Status: Not started**

- [ ] Settings page with server URL config
- [ ] Theme selector (light/dark/auto)
- [ ] Connection status display
- [ ] API key management (via server API)

## Phase 22h: Multi-Provider
**Status: Not started**

- [ ] OpenAI provider via generic agent loop
- [ ] Groq provider via generic agent loop
- [ ] Provider selector in session controls

## Phase 22i: Session History
**Status: Not started**

- [ ] Fetch session history from server API
- [ ] History list view
- [ ] Session detail / log replay view

## Phase 22j: Build & Packaging
**Status: Not started**

- [ ] App icons (PNG, ICNS, ICO)
- [ ] Windows NSIS installer
- [ ] Mac DMG
- [ ] Linux AppImage + deb
- [ ] Code signing (Mac + Windows)

## Phase 22k: Auto-Update
**Status: Complete**

- [x] Add `electron-log` dependency
- [x] Create `src/main/updater.ts` — auto-updater module with IPC event emission
- [x] Wire updater into `src/main/index.ts` (skip in dev mode)
- [x] Add update IPC methods to `src/preload/index.ts`
- [x] Create `src/renderer/components/UpdateNotification.tsx` — restart prompt UI
- [x] Integrate UpdateNotification into App.tsx
- [x] Update GitHub Actions CI to publish releases (`--publish always`)
- [x] Test update flow with a version bump

## Phase 22l: Documentation
**Status: Not started**

- [ ] Desktop app section in web docs
- [ ] Download links on frontend landing page
- [ ] README.md for this repo
