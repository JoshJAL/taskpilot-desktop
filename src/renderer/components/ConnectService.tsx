import { useState, useEffect, useRef } from "react";

interface ConnectServiceProps {
  /** The API path segment: "trello", "github", "gitlab", "google", "onedrive" */
  provider: string;
  label: string;
  isConnected: boolean;
  onStatusChange: () => void;
  /** Brand color for the connect button */
  brandColor: string;
  brandHoverColor: string;
  /** Optional: dark mode overrides for GitHub-style inverted buttons */
  darkBg?: string;
  darkText?: string;
  darkHoverBg?: string;
}

export function ConnectService({
  provider,
  label,
  isConnected,
  onStatusChange,
  brandColor,
  brandHoverColor,
  darkBg,
  darkText,
  darkHoverBg,
}: ConnectServiceProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForCallback, setWaitingForCallback] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const data = await window.taskpilot.oauthAuthorize(provider) as { url: string };
      if (!data.url) throw new Error("No authorize URL returned");

      // Open OAuth URL in system browser
      await window.taskpilot.openExternal(data.url);

      // Start polling for connection status
      setWaitingForCallback(true);
      setLoading(false);

      pollRef.current = setInterval(async () => {
        try {
          const status = await window.taskpilot.getIntegrationStatus() as Record<string, boolean>;
          const key = getStatusKey(provider);
          if (key && status[key]) {
            // Connection detected!
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setWaitingForCallback(false);
            onStatusChange();
          }
        } catch {
          // Ignore polling errors
        }
      }, 2000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setWaitingForCallback(false);
        }
      }, 5 * 60 * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to connect ${label}`);
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      await window.taskpilot.oauthDisconnect(provider);
      onStatusChange();
    } catch {
      setError(`Failed to disconnect ${label}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCancelWaiting() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setWaitingForCallback(false);
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-200 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <span className="text-green-900 dark:text-green-400">&#10003;</span>
          <span className="text-sm font-medium text-green-900 dark:text-green-300">
            {label} connected
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (waitingForCallback) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Waiting for {label} authorization...
            </span>
          </div>
          <button
            onClick={handleCancelWaiting}
            className="text-sm text-(--sea-ink-soft) hover:underline"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-(--sea-ink-soft)">
          Complete the authorization in your browser. This will update automatically once connected.
        </p>
      </div>
    );
  }

  const darkStyles = darkBg
    ? `dark:bg-[${darkBg}] dark:text-[${darkText}] dark:hover:bg-[${darkHoverBg}]`
    : "";

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleConnect}
        disabled={loading}
        className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${darkStyles}`}
        style={{
          backgroundColor: brandColor,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.backgroundColor = brandHoverColor;
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.backgroundColor = brandColor;
        }}
      >
        {loading ? "Connecting..." : `Connect ${label}`}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function getStatusKey(provider: string): string | null {
  switch (provider) {
    case "trello":
      return "trelloLinked";
    case "github":
      return "githubLinked";
    case "gitlab":
      return "gitlabLinked";
    case "google":
      return "googleDriveLinked";
    case "onedrive":
      return "oneDriveLinked";
    default:
      return null;
  }
}
