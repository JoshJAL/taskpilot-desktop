import { Terminal, LogOut } from "lucide-react";

interface DashboardProps {
  session: Record<string, unknown>;
  onLogout: () => void;
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const user = session.user as { name?: string; email?: string } | undefined;

  async function handleLogout() {
    await window.taskpilot.logout();
    onLogout();
  }

  return (
    <div className="flex min-h-screen bg-(--sand)">
      {/* Sidebar placeholder */}
      <aside className="flex w-56 flex-col border-r border-(--shore-line) bg-(--sand) p-4">
        <div className="mb-6 flex items-center gap-2">
          <Terminal size={18} className="text-(--lagoon)" />
          <span className="font-bold text-(--sea-ink)">TaskPilot</span>
        </div>

        <nav className="flex-1 space-y-1 text-sm">
          <p className="px-2 py-1.5 text-xs font-medium text-(--sea-ink-soft)">
            Dashboard coming soon
          </p>
          <p className="px-2 py-1.5 text-xs text-(--shore-line)">
            Task source boards, session controls, and workspace selection will be ported from the web app.
          </p>
        </nav>

        <div className="border-t border-(--shore-line) pt-4">
          <p className="mb-2 truncate text-xs text-(--sea-ink-soft)">
            {user?.name ?? user?.email ?? "Signed in"}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-(--sea-ink-soft) hover:text-(--sea-ink)"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <h1 className="mb-2 text-2xl font-bold text-(--sea-ink)">
          Welcome to TaskPilot Desktop
        </h1>
        <p className="text-sm text-(--sea-ink-soft)">
          This is the initial scaffold. The full dashboard UI will be ported from the web app in Phase 22d.
        </p>

        <div className="mt-8 island-shell rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-(--sea-ink)">
            What's working
          </h2>
          <ul className="space-y-2 text-sm text-(--sea-ink-soft)">
            <li>Authentication against the TaskPilot server</li>
            <li>IPC bridge between renderer and main process</li>
            <li>Local settings storage (encrypted)</li>
            <li>Native directory picker (for local mode)</li>
          </ul>
        </div>

        <div className="mt-4 island-shell rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-(--sea-ink)">
            Coming next
          </h2>
          <ul className="space-y-2 text-sm text-(--sea-ink-soft)">
            <li>Board/repo/project selection</li>
            <li>Session controls with workspace picker</li>
            <li>Local mode sessions via Claude Agent SDK</li>
            <li>Cloud mode sessions via generic agent loop</li>
            <li>Session log streaming</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
