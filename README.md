# TaskPilot Desktop

> AI coding agents meet task boards, on your desktop

TaskPilot Desktop brings the full TaskPilot experience to Windows, Mac, and Linux with native capabilities like local filesystem access and system integrations.

## Features

### 🚀 **Local & Cloud Modes**
- **Local Mode**: Work directly on your local codebase with full filesystem access
- **Cloud Mode**: Work on GitHub repos, GitLab projects, and cloud storage folders

### 🎯 **Multi-Source Task Management**
- **Trello Boards**: Import cards with checklists as structured tasks
- **GitHub Issues**: Work on issues with task lists
- **GitLab Issues**: Handle merge request tasks and project issues

### 🧠 **Multi-Provider AI Support**
- **Claude** (Anthropic) - Recommended for coding tasks
- **GPT-4** (OpenAI) - Versatile problem solving
- **Llama 3.3** (Groq) - Fast inference

### 💾 **Cloud Storage Integration**
- **Google Drive**: Work with Docs, Sheets, and folders
- **OneDrive**: Excel files and document collaboration
- **Direct GitHub/GitLab**: Repository-based workflows

## Installation

### Download Pre-built Binaries

| Platform | Download Link |
|----------|---------------|
| Windows | [TaskPilot-Setup.exe](https://github.com/JoshJAL/taskpilot-desktop/releases/latest/download/TaskPilot-Setup.exe) |
| macOS | [TaskPilot-mac.dmg](https://github.com/JoshJAL/taskpilot-desktop/releases/latest/download/TaskPilot-mac.dmg) |
| Linux (AppImage) | [TaskPilot.AppImage](https://github.com/JoshJAL/taskpilot-desktop/releases/latest/download/TaskPilot.AppImage) |
| Linux (deb) | [TaskPilot.deb](https://github.com/JoshJAL/taskpilot-desktop/releases/latest/download/TaskPilot.deb) |

### System Requirements
- **Windows**: Windows 10 or later
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Recent distribution with GLIBC 2.28+

## Quick Start

1. **Launch TaskPilot Desktop** and sign in with your account
2. **Connect Integrations**: Link Trello, GitHub, GitLab in Settings
3. **Add API Keys**: Configure Claude, OpenAI, or Groq API keys
4. **Select a Board/Repo**: Choose your task source from the sidebar
5. **Pick a Directory**: For local mode, select your project folder
6. **Start Session**: Click "Start Session" to begin

### Local Mode vs Cloud Mode

| Mode | Best For | Workspace | AI Execution |
|------|----------|-----------|--------------|
| **Local** | Code projects, full control | Local directory | Direct tool access |
| **Cloud** | Collaboration, web editing | GitHub/GitLab repos, Drive folders | Server-side execution |

## Development

### Prerequisites
- **Node.js** 20+ and npm
- **Git** for version control

### Setup
```bash
# Clone the repository
git clone https://github.com/JoshJAL/taskpilot-desktop.git
cd taskpilot-desktop

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build Commands
```bash
# Type checking
npm run typecheck

# Build for current platform
npm run build
npm run package

# Build for specific platforms
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

## Architecture

TaskPilot Desktop is built with:

- **Electron** - Cross-platform desktop framework
- **React 19** - Modern UI with TypeScript
- **electron-vite** - Fast build tooling
- **Tailwind CSS** - Consistent design system
- **TanStack Query** - Server state management

### Process Architecture
```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────────┐
│ Renderer        │       │ Preload          │       │ Main Process        │
│ (React UI)      │◄─────►│ (IPC Bridge)     │◄─────►│ (Node.js Backend)   │
│                 │  IPC  │                  │  IPC  │                     │
│ - Dashboard     │       │ window.taskpilot │       │ - Session Runner    │
│ - Settings      │       │                  │       │ - API Client        │
│ - Session Log   │       │                  │       │ - File System       │
└─────────────────┘       └──────────────────┘       └─────────────────────┘
```

## Configuration

### Server Connection
By default, TaskPilot Desktop connects to the hosted TaskPilot service at `https://claude-trello-zeta.vercel.app`. You can change this in Settings → Server URL for self-hosted instances.

### Data Storage
- **Session cookies**: Encrypted local storage via electron-store
- **Settings**: Local preferences (theme, directories, etc.)
- **Session history**: Stored on the server for cross-device access

## Auto-Updates

TaskPilot Desktop automatically checks for updates every 4 hours and on startup. When an update is available:

1. **Download** happens in the background
2. **Notification** appears when ready
3. **Restart** to install the new version

Updates work on Windows (NSIS), macOS (DMG), and Linux (AppImage). Debian package users will see a download link instead.

## Support & Links

- **Main Documentation**: [task-pilot.dev](https://task-pilot.dev)
- **GitHub Issues**: [Report bugs or request features](https://github.com/JoshJAL/taskpilot-desktop/issues)
- **Web App**: [claude-trello-zeta.vercel.app](https://claude-trello-zeta.vercel.app)
- **CLI Tool**: [@joshjal/taskpilot](https://www.npmjs.com/package/@joshjal/taskpilot)

## License

MIT © [Joshua Levine](https://github.com/JoshJAL)