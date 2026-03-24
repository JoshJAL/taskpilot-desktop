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
**Status: Complete**

- [x] Native directory picker integration
- [x] Generic agent loop session runner in main process (uses direct tool implementations instead of MCP)
- [x] SSE-like event streaming via IPC (`session:event`)
- [x] Session start/stop IPC handlers
- [x] Direct tool implementations for Trello/GitHub/GitLab/filesystem operations

## Phase 22d: UI Port
**Status: Complete**

- [x] Sidebar navigation (adapted from web app)
- [x] Board selector / repo selector / project selector
- [x] SessionControls with mode/provider/workspace selection
- [x] SessionLog component
- [x] BoardPanel with card list
- [x] Toast notifications
- [x] Theme toggle (synced with electron-store)
- [x] Complete UI matching web app design

## Phase 22e: Cloud Mode (Repos)
**Status: Complete**

- [x] Generic agent loop in main process (via server proxy)
- [x] GitHub web mode tools (via server API)
- [x] GitLab web mode tools (via server API)
- [x] Repository and project integration

## Phase 22f: Cloud Mode (Storage)
**Status: Complete**

- [x] Google Drive integration (via server API)
- [x] OneDrive integration (via server API)
- [x] Storage workspace selection
- [x] Google Docs support (via server)
- [x] Google Sheets support (via server)
- [x] Excel support (via server)

## Phase 22g: Settings
**Status: Complete**

- [x] Settings page with server URL config
- [x] Theme selector (light/dark/auto)
- [x] Connection status display
- [x] API key management (via server API)

## Phase 22h: Multi-Provider
**Status: Complete**

- [x] OpenAI provider via generic agent loop
- [x] Groq provider via generic agent loop
- [x] Claude provider via generic agent loop
- [x] Provider selector in session controls

## Phase 22i: Session History
**Status: Complete**

- [x] Fetch session history from server API
- [x] History list view
- [x] Session detail / log replay view

## Phase 22j: Build & Packaging
**Status: Complete**

- [x] App icons (PNG, ICNS, ICO)
- [x] Windows NSIS installer
- [x] Mac DMG
- [x] Linux AppImage + deb
- [x] GitHub Actions CI/CD pipeline
- [ ] Code signing (Mac + Windows) — requires certificates

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
**Status: In progress**

- [ ] Desktop app section in web docs
- [ ] Download links on frontend landing page
- [x] README.md for this repo
