import { useState } from "react";
import { Terminal } from "lucide-react";

interface LoginPageProps {
  onLogin: (session: Record<string, unknown>) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await window.taskpilot.login(email, password);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--sand)">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Terminal size={24} className="text-(--lagoon)" />
            <h1 className="text-2xl font-bold text-(--sea-ink)">TaskPilot</h1>
          </div>
          <p className="text-sm text-(--sea-ink-soft)">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="island-shell space-y-4 rounded-2xl p-6">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-(--shore-line) bg-white px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-(--shore-line) bg-white px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-(--lagoon) px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
