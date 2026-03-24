import { useReducer } from "react";
import { FolderOpen } from "lucide-react";
import { useIntegrationStatus } from "../hooks/useIntegrationStatus";
import { useGitHubRepos } from "../hooks/useGitHubRepos";
import { useGitLabProjects } from "../hooks/useGitLabProjects";
import type { AiProviderId } from "../types";
import { PROVIDER_SHORT_LABELS, PROVIDER_MODELS, DEFAULT_MODEL } from "../types";
import { WorkspacePicker } from "./WorkspacePicker";

interface SessionControlsProps {
  isRunning: boolean;
  canStart: boolean;
  activeCardCount?: number;
  source?: "trello" | "github" | "gitlab";
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
  onStart: (opts: {
    cwd: string;
    userMessage?: string;
    mode: "sequential" | "parallel";
    concurrency: number;
    providerId: AiProviderId;
    modelId?: string;
    webMode?: boolean;
    linkedRepo?: { owner: string; repo: string };
    linkedGitlabProjectId?: number;
    selectedBranch?: string;
    linkedWorkspace?: { provider: "google" | "onedrive"; folderId: string };
  }) => void;
  onStop: () => void;
  /** Persisted project directory from parent */
  cwd: string;
  onCwdChange: (cwd: string) => void;
}

interface ControlsState {
  webMode: boolean;
  initialMessage: string;
  mode: "sequential" | "parallel";
  concurrency: number;
  providerId: AiProviderId;
  modelId: string;
  workspaceKey: string;
}

type ControlsAction =
  | { type: "SET_WEB_MODE"; value: boolean }
  | { type: "SET_MESSAGE"; value: string }
  | { type: "SET_MODE"; value: "sequential" | "parallel" }
  | { type: "SET_CONCURRENCY"; value: number }
  | { type: "SET_PROVIDER"; value: AiProviderId }
  | { type: "SET_MODEL"; value: string }
  | { type: "SET_WORKSPACE"; value: string };

function controlsReducer(state: ControlsState, action: ControlsAction): ControlsState {
  switch (action.type) {
    case "SET_WEB_MODE":
      return { ...state, webMode: action.value };
    case "SET_MESSAGE":
      return { ...state, initialMessage: action.value };
    case "SET_MODE":
      return { ...state, mode: action.value };
    case "SET_CONCURRENCY":
      return { ...state, concurrency: action.value };
    case "SET_PROVIDER":
      return { ...state, providerId: action.value, modelId: DEFAULT_MODEL[action.value] };
    case "SET_MODEL":
      return { ...state, modelId: action.value };
    case "SET_WORKSPACE":
      return { ...state, workspaceKey: action.value };
  }
}

export function SessionControls({
  isRunning,
  canStart,
  activeCardCount,
  source = "trello",
  onStart,
  onStop,
  cwd,
  onCwdChange,
}: SessionControlsProps) {
  const { configuredProviders, githubLinked, gitlabLinked, googleDriveLinked, oneDriveLinked } =
    useIntegrationStatus();

  const isGitSource = source === "github" || source === "gitlab";

  const [state, dispatch] = useReducer(controlsReducer, {
    webMode: isGitSource,
    initialMessage: "",
    mode: "sequential" as const,
    concurrency: 3,
    providerId: configuredProviders[0] ?? "claude",
    modelId: DEFAULT_MODEL[configuredProviders[0] ?? "claude"],
    workspaceKey: "",
  });

  const hasAnyWorkspace = githubLinked || gitlabLinked || googleDriveLinked || oneDriveLinked;
  const showWorkspacePicker = source === "trello" && state.webMode && hasAnyWorkspace;
  const { data: ghRepos } = useGitHubRepos(showWorkspacePicker && githubLinked);
  const { data: glProjects } = useGitLabProjects(showWorkspacePicker && gitlabLinked);

  const linkedRepo = state.workspaceKey.startsWith("github:")
    ? {
        owner: state.workspaceKey.slice(7).split("/")[0],
        repo: state.workspaceKey.slice(7).split("/")[1],
      }
    : undefined;
  const linkedGitlabProjectId = state.workspaceKey.startsWith("gitlab:")
    ? Number(state.workspaceKey.slice(7))
    : undefined;
  const linkedWorkspace =
    state.workspaceKey.startsWith("google:") || state.workspaceKey.startsWith("onedrive:")
      ? {
          provider: state.workspaceKey.split(":")[0] as "google" | "onedrive",
          folderId: state.workspaceKey.split(":").slice(1).join(":"),
        }
      : undefined;

  async function handleSelectDirectory() {
    const dir = await window.taskpilot.selectDirectory();
    if (dir) {
      onCwdChange(dir as string);
    }
  }

  function handleStart() {
    if (!state.webMode && !cwd.trim()) return;
    onStart({
      cwd: state.webMode ? "" : cwd.trim(),
      userMessage: state.initialMessage.trim() || undefined,
      mode: state.webMode ? "sequential" : state.mode,
      concurrency: state.concurrency,
      providerId: state.providerId,
      modelId: state.modelId,
      webMode: state.webMode,
      linkedRepo,
      linkedGitlabProjectId,
      selectedBranch: undefined,
      linkedWorkspace,
    });
  }

  const needsCwd = !state.webMode && !cwd.trim();

  return (
    <div className="island-shell flex flex-col gap-3 rounded-xl p-4">
      {/* Workspace picker for Trello source in web mode */}
      {showWorkspacePicker && !isRunning && (
        <WorkspacePicker
          workspaceKey={state.workspaceKey}
          onWorkspaceKeyChange={(v) => dispatch({ type: "SET_WORKSPACE", value: v })}
          githubLinked={githubLinked}
          gitlabLinked={gitlabLinked}
          googleDriveLinked={googleDriveLinked}
          oneDriveLinked={oneDriveLinked}
          ghRepos={ghRepos}
          glProjects={glProjects}
        />
      )}

      <div className="flex items-end gap-3">
        {/* Local mode: directory picker */}
        {!state.webMode && !isRunning && (
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
              Project directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cwd}
                onChange={(e) => onCwdChange(e.target.value)}
                placeholder="/home/user/my-project"
                className="flex-1 rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
              />
              <button
                onClick={handleSelectDirectory}
                className="shrink-0 rounded-lg border border-(--shore-line) px-3 py-2 text-sm text-(--sea-ink-soft) transition hover:bg-(--foam) hover:text-(--sea-ink)"
                title="Browse..."
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Show current directory when running in local mode */}
        {!state.webMode && isRunning && cwd && (
          <div className="flex-1">
            <span className="text-xs text-(--sea-ink-soft)">Working in: </span>
            <span className="text-xs font-medium text-(--sea-ink)">{cwd}</span>
          </div>
        )}

        {/* Initial message */}
        {!isRunning && (
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-(--sea-ink-soft)">
              Initial instructions{" "}
              <span className="font-normal text-(--shore-line)">(optional)</span>
            </label>
            <textarea
              value={state.initialMessage}
              onChange={(e) => dispatch({ type: "SET_MESSAGE", value: e.target.value })}
              placeholder='e.g. "Focus on the API issues first"'
              rows={2}
              className="w-full resize-none rounded-lg border border-(--shore-line) bg-white/60 px-3 py-2 text-sm text-(--sea-ink) outline-none transition focus:border-(--lagoon) focus:ring-2 focus:ring-(--lagoon)/20 dark:bg-white/5"
            />
          </div>
        )}

        {/* Start / Stop button */}
        {isRunning ? (
          <button
            onClick={onStop}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Stop Session
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!canStart || needsCwd}
            title={needsCwd ? "Select a project directory first" : undefined}
            className="shrink-0 rounded-lg bg-(--lagoon) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Start Session
          </button>
        )}
      </div>

      {/* Toolbar row */}
      {!isRunning && (
        <div className="flex flex-wrap items-center gap-4">
          {/* Provider selector */}
          {configuredProviders.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-(--sea-ink-soft)">AI:</span>
              <select
                value={state.providerId}
                onChange={(e) => dispatch({ type: "SET_PROVIDER", value: e.target.value as AiProviderId })}
                className="rounded-lg border border-(--shore-line) bg-white px-2 py-1 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
              >
                {configuredProviders.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_SHORT_LABELS[p] ?? p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-(--sea-ink-soft)">Model:</span>
            <select
              value={state.modelId}
              onChange={(e) => dispatch({ type: "SET_MODEL", value: e.target.value })}
              className="rounded-lg border border-(--shore-line) bg-white px-2 py-1 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
            >
              {PROVIDER_MODELS[state.providerId].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Env toggle */}
          <ToggleGroup
            label="Env"
            options={[
              { value: "local", label: "Local" },
              { value: "cloud", label: "Cloud" },
            ]}
            value={state.webMode ? "cloud" : "local"}
            onChange={(v) => dispatch({ type: "SET_WEB_MODE", value: v === "cloud" })}
          />

          {/* Mode toggle (local only) */}
          {!state.webMode && (
            <ToggleGroup
              label="Mode"
              options={[
                { value: "sequential", label: "Sequential" },
                { value: "parallel", label: "Parallel" },
              ]}
              value={state.mode}
              onChange={(v) => dispatch({ type: "SET_MODE", value: v as "sequential" | "parallel" })}
            />
          )}

          {/* Concurrency slider (parallel mode) */}
          {!state.webMode && state.mode === "parallel" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-(--sea-ink-soft)">Concurrency:</label>
              <input
                type="range"
                min={1}
                max={5}
                value={state.concurrency}
                onChange={(e) => dispatch({ type: "SET_CONCURRENCY", value: Number(e.target.value) })}
                className="h-1.5 w-20 accent-(--lagoon)"
              />
              <span className="w-4 text-center text-xs font-medium text-(--sea-ink)">
                {state.concurrency}
              </span>
            </div>
          )}

          {/* Active card count */}
          {!state.webMode && state.mode === "parallel" && activeCardCount !== undefined && activeCardCount > 0 && (
            <span className="text-xs text-(--sea-ink-soft)">
              {activeCardCount} item{activeCardCount !== 1 ? "s" : ""} will each get their own agent
            </span>
          )}

          {/* No directory warning */}
          {needsCwd && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Select a project directory to start
            </span>
          )}
        </div>
      )}

      {/* Running indicator */}
      {isRunning && (
        <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Session running
        </p>
      )}
    </div>
  );
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-(--sea-ink-soft)">{label}:</span>
      <div className="inline-flex rounded-lg border border-(--shore-line) p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              value === opt.value
                ? "bg-(--lagoon) text-white"
                : "text-(--sea-ink-soft) hover:text-(--sea-ink)"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
