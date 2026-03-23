import { useState, useEffect } from "react";
import { Download, RefreshCw, X } from "lucide-react";

type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; version: string; releaseNotes: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Get current status on mount
    window.taskpilot.getUpdateStatus().then(setStatus);

    // Listen for update events
    const cleanup = window.taskpilot.onUpdateEvent((event: unknown) => {
      setStatus(event as UpdateStatus);
      setDismissed(false);
    });

    return () => {
      cleanup();
    };
  }, []);

  if (dismissed) return null;

  if (status.state === "downloading") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-(--line) bg-(--surface-strong) px-4 py-3 shadow-lg backdrop-blur-sm">
        <RefreshCw size={16} className="animate-spin text-(--lagoon)" />
        <span className="text-sm font-medium text-(--sea-ink)">
          Downloading update… {status.percent}%
        </span>
      </div>
    );
  }

  if (status.state === "downloaded") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-(--line) bg-(--surface-strong) px-4 py-3 shadow-lg backdrop-blur-sm">
        <Download size={16} className="text-(--lagoon)" />
        <span className="text-sm font-medium text-(--sea-ink)">
          Version {status.version} ready
        </span>
        <button
          onClick={() => window.taskpilot.installUpdate()}
          className="rounded-lg bg-(--lagoon) px-3 py-1 text-xs font-semibold text-white hover:bg-(--lagoon-deep)"
        >
          Restart Now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 rounded p-1 text-(--sea-ink-soft) hover:bg-(--link-bg-hover)"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return null;
}
