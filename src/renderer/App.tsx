import { useState, useEffect } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";

declare global {
  interface Window {
    taskpilot: import("../preload/index").TaskPilotAPI;
  }
}

export default function App() {
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.taskpilot
      .getSession()
      .then((s) => setSession(s))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-(--sand)">
        <p className="text-sm text-(--sea-ink-soft)">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLogin={(s) => setSession(s)} />;
  }

  return <Dashboard session={session} onLogout={() => setSession(null)} />;
}
