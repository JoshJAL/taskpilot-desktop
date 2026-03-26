import { useState, useEffect } from "react";
import { useIntegrationStatus } from "../hooks/useIntegrationStatus";
import { ConnectService } from "./ConnectService";
import { ApiKeyForm } from "./ApiKeyForm";
import type { AiProviderId } from "../types";

const PROVIDERS: Array<{ id: AiProviderId; label: string }> = [
  { id: "claude", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI (ChatGPT)" },
  { id: "groq", label: "Groq" },
];

interface SettingsPageProps {
  onAccountDeleted?: () => void;
}

export function SettingsPage({ onAccountDeleted }: SettingsPageProps) {
  const {
    trelloLinked,
    githubLinked,
    gitlabLinked,
    googleDriveLinked,
    oneDriveLinked,
    configuredProviders,
    refetch,
  } = useIntegrationStatus();

  const [serverUrl, setServerUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.taskpilot.getSettings().then((s: { serverUrl?: string }) => {
      if (s.serverUrl) setServerUrl(s.serverUrl);
    });
  }, []);

  function handleSaveServerUrl() {
    window.taskpilot.updateSettings({ serverUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-(--sea-ink)">Settings</h1>

      {/* Task Sources */}
      <section className="island-shell rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-(--sea-ink)">
          Task Sources
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">Trello</h3>
            <ConnectService
              provider="trello"
              label="Trello"
              isConnected={trelloLinked}
              onStatusChange={() => refetch()}
              brandColor="#0079BF"
              brandHoverColor="#026AA7"
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">GitHub</h3>
            <ConnectService
              provider="github"
              label="GitHub"
              isConnected={githubLinked}
              onStatusChange={() => refetch()}
              brandColor="#24292f"
              brandHoverColor="#1b1f23"
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">GitLab</h3>
            <ConnectService
              provider="gitlab"
              label="GitLab"
              isConnected={gitlabLinked}
              onStatusChange={() => refetch()}
              brandColor="#FC6D26"
              brandHoverColor="#e5622a"
            />
          </div>
        </div>
      </section>

      {/* Workspaces */}
      <section className="island-shell rounded-2xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
          Workspaces
        </h2>
        <p className="mb-4 text-sm text-(--sea-ink-soft)">
          Connect cloud storage to use as a workspace for AI agents. Agents can
          read, write, and edit files — including spreadsheets — directly in your
          connected storage.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">Google Drive</h3>
            <ConnectService
              provider="google"
              label="Google Drive"
              isConnected={googleDriveLinked}
              onStatusChange={() => refetch()}
              brandColor="#4285f4"
              brandHoverColor="#3367d6"
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">OneDrive</h3>
            <ConnectService
              provider="onedrive"
              label="OneDrive"
              isConnected={oneDriveLinked}
              onStatusChange={() => refetch()}
              brandColor="#0078d4"
              brandHoverColor="#106ebe"
            />
          </div>
        </div>
      </section>

      {/* AI Providers */}
      <section className="island-shell rounded-2xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
          AI Providers
        </h2>
        <p className="mb-4 text-sm text-(--sea-ink-soft)">
          Configure at least one AI provider to start sessions. You can use
          different providers for different boards.
        </p>
        <div className="space-y-5">
          {PROVIDERS.map((provider) => (
            <div key={provider.id}>
              <h3 className="mb-2 text-sm font-semibold text-(--sea-ink)">
                {provider.label}
              </h3>
              <ApiKeyForm
                providerId={provider.id}
                hasKey={configuredProviders.includes(provider.id)}
                onSaved={() => refetch()}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Server URL */}
      <section className="island-shell rounded-2xl p-6">
        <h2 className="mb-3 text-sm font-semibold text-(--sea-ink)">Server URL</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="flex-1 rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
          />
          <button
            onClick={handleSaveServerUrl}
            className="shrink-0 rounded-lg bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
        <p className="mt-1 text-xs text-(--sea-ink-soft)">
          The TaskPilot server this app connects to for authentication and sessions.
        </p>
      </section>

      {/* About */}
      <section className="island-shell rounded-2xl p-6">
        <h2 className="mb-2 text-sm font-semibold text-(--sea-ink)">About</h2>
        <p className="text-xs text-(--sea-ink-soft)">
          TaskPilot Desktop v0.1.0 — AI coding agents meet task boards, on your desktop.
        </p>
      </section>

      {/* Danger Zone */}
      <DeleteAccountSection onDeleted={onAccountDeleted} />
    </div>
  );
}

function DeleteAccountSection({ onDeleted }: { onDeleted?: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirmText !== "delete my account") return;
    setDeleting(true);
    setError("");

    try {
      await window.taskpilot.deleteAccount();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <section className="island-shell rounded-2xl border border-red-200 p-6 dark:border-red-900/40">
      <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
        Danger Zone
      </h2>
      <p className="mb-4 text-sm text-(--sea-ink-soft)">
        Permanently delete your account and all associated data. This includes
        session history, API keys, OAuth connections, and settings. This action
        cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Delete account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-(--sea-ink)">
            Type <span className="font-mono text-red-600 dark:text-red-400">delete my account</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete my account"
            className="w-full rounded-lg border border-red-300 bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-800 dark:bg-white/5"
            disabled={deleting}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmText !== "delete my account" || deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Permanently delete my account"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError("");
              }}
              disabled={deleting}
              className="rounded-lg border border-(--shore-line) px-4 py-2 text-sm text-(--sea-ink) transition hover:bg-(--foam) disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
