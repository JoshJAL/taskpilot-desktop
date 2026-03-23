import { useState, useRef, useEffect, useMemo } from "react";
import { Github, Gitlab, Cloud, HardDrive, X, Search, ChevronDown } from "lucide-react";
import type { GitHubRepo, GitLabProject } from "../types";

type WorkspaceType = "github" | "gitlab" | "google" | "onedrive";

interface WorkspacePickerProps {
  workspaceKey: string;
  onWorkspaceKeyChange: (key: string) => void;
  githubLinked: boolean;
  gitlabLinked: boolean;
  googleDriveLinked: boolean;
  oneDriveLinked: boolean;
  ghRepos?: GitHubRepo[];
  glProjects?: GitLabProject[];
}

interface TypeOption {
  type: WorkspaceType;
  label: string;
  icon: typeof Github;
  connected: boolean;
}

export function WorkspacePicker({
  workspaceKey,
  onWorkspaceKeyChange,
  githubLinked,
  gitlabLinked,
  googleDriveLinked,
  oneDriveLinked,
  ghRepos,
  glProjects,
}: WorkspacePickerProps) {
  const selectedType: WorkspaceType | null = workspaceKey.startsWith("github:")
    ? "github"
    : workspaceKey.startsWith("gitlab:")
      ? "gitlab"
      : workspaceKey.startsWith("google:")
        ? "google"
        : workspaceKey.startsWith("onedrive:")
          ? "onedrive"
          : null;

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [activeType, setActiveType] = useState<WorkspaceType | null>(selectedType);

  const types: TypeOption[] = useMemo(() => {
    const list: TypeOption[] = [];
    if (githubLinked) list.push({ type: "github", label: "GitHub", icon: Github, connected: true });
    if (gitlabLinked) list.push({ type: "gitlab", label: "GitLab", icon: Gitlab, connected: true });
    if (googleDriveLinked) list.push({ type: "google", label: "Google Drive", icon: Cloud, connected: true });
    if (oneDriveLinked) list.push({ type: "onedrive", label: "OneDrive", icon: HardDrive, connected: true });
    return list;
  }, [githubLinked, gitlabLinked, googleDriveLinked, oneDriveLinked]);

  if (types.length === 0) return null;

  function selectType(type: WorkspaceType) {
    setActiveType(type);
    setTypePickerOpen(false);
    onWorkspaceKeyChange("");
  }

  function clearAll() {
    setActiveType(null);
    onWorkspaceKeyChange("");
  }

  const activeTypeInfo = types.find((t) => t.type === activeType);

  // If workspace is already selected, show chip
  if (workspaceKey) {
    const TypeIcon =
      selectedType === "github" ? Github
        : selectedType === "gitlab" ? Gitlab
          : selectedType === "google" ? Cloud
            : HardDrive;
    const typeLabel =
      selectedType === "github" ? "GitHub"
        : selectedType === "gitlab" ? "GitLab"
          : selectedType === "google" ? "Google Drive"
            : "OneDrive";
    const displayLabel = workspaceKey.includes(":")
      ? workspaceKey.split(":").slice(1).join(":")
      : workspaceKey;

    return (
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs font-medium text-(--sea-ink-soft)">
          Workspace:
        </label>
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-(--shore-line) bg-white px-2 py-1.5 dark:bg-[#1e1e1e]">
          <TypeIcon size={14} className="shrink-0 text-(--sea-ink-soft)" />
          <span className="text-xs text-(--sea-ink-soft)">{typeLabel}:</span>
          <span className="flex-1 truncate text-xs text-(--sea-ink)">
            {displayLabel}
          </span>
          <button
            onClick={clearAll}
            className="shrink-0 rounded p-0.5 text-(--sea-ink-soft) hover:bg-(--foam) hover:text-(--sea-ink)"
            title="Remove workspace"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Step 1: Type picker */}
      {!activeType && (
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs font-medium text-(--sea-ink-soft)">
            Workspace:
          </label>
          <div className="relative flex-1">
            <button
              onClick={() => setTypePickerOpen(!typePickerOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-(--shore-line) bg-white px-3 py-1.5 text-xs text-(--sea-ink-soft) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
            >
              Select workspace type...
              <ChevronDown size={14} />
            </button>

            {typePickerOpen && (
              <TypeDropdown types={types} onSelect={selectType} onClose={() => setTypePickerOpen(false)} />
            )}
          </div>
        </div>
      )}

      {/* Step 2: Resource picker based on selected type */}
      {activeType && !workspaceKey && (
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs font-medium text-(--sea-ink-soft)">
            <button onClick={clearAll} className="hover:text-(--lagoon)" title="Change workspace type">
              {activeTypeInfo && <activeTypeInfo.icon size={14} className="mr-1 inline" />}
              {activeTypeInfo?.label}:
            </button>
          </label>
          {activeType === "github" && (
            <RepoSearch
              options={(ghRepos ?? []).map((r) => ({ key: `github:${r.full_name}`, label: r.full_name }))}
              onSelect={onWorkspaceKeyChange}
              placeholder="Search repos..."
              icon={Github}
            />
          )}
          {activeType === "gitlab" && (
            <RepoSearch
              options={(glProjects ?? []).map((p) => ({ key: `gitlab:${p.id}`, label: p.path_with_namespace }))}
              onSelect={onWorkspaceKeyChange}
              placeholder="Search projects..."
              icon={Gitlab}
            />
          )}
          {activeType === "google" && (
            <FolderBrowser provider="google" onSelect={onWorkspaceKeyChange} />
          )}
          {activeType === "onedrive" && (
            <FolderBrowser provider="onedrive" onSelect={onWorkspaceKeyChange} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function TypeDropdown({
  types,
  onSelect,
  onClose,
}: {
  types: TypeOption[];
  onSelect: (type: WorkspaceType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-(--shore-line) bg-white shadow-lg dark:bg-[#1e1e1e]">
      {types.map((t) => (
        <button
          key={t.type}
          onClick={() => onSelect(t.type)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink) hover:bg-(--foam)"
        >
          <t.icon size={14} className="shrink-0 text-(--sea-ink-soft)" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function RepoSearch({
  options,
  onSelect,
  placeholder,
  icon: Icon,
}: {
  options: Array<{ key: string; label: string }>;
  onSelect: (key: string) => void;
  placeholder: string;
  icon: typeof Github;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-(--sea-ink-soft)" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-lg border border-(--shore-line) bg-white py-1.5 pl-8 pr-3 text-xs text-(--sea-ink) outline-none focus:border-(--lagoon) dark:bg-[#1e1e1e] dark:text-[#e0e0e0]"
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--shore-line) bg-white shadow-lg dark:bg-[#1e1e1e]">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-(--sea-ink-soft)">
              {query.trim() ? `No results for "${query}"` : "No items available"}
            </p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink) hover:bg-(--foam)"
            >
              <Icon size={14} className="shrink-0 text-(--sea-ink-soft)" />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderBrowser({
  provider,
  onSelect,
}: {
  provider: "google" | "onedrive";
  onSelect: (key: string) => void;
}) {
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([
    { id: "root", name: provider === "google" ? "My Drive" : "OneDrive" },
  ]);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchFolders = provider === "google"
      ? window.taskpilot.getGoogleFolders(currentFolderId)
      : window.taskpilot.getOneDriveFolders(currentFolderId);

    fetchFolders
      .then((data: Array<{ id: string; name: string }>) => setFolders(data ?? []))
      .catch((err: Error) => {
        setFolders([]);
        setError(err.message || "Failed to load folders");
      })
      .finally(() => setLoading(false));
  }, [currentFolderId, provider]);

  function navigateInto(folderId: string, folderName: string) {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
  }

  function navigateTo(index: number) {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  const Icon = provider === "google" ? Cloud : HardDrive;
  const currentName = breadcrumbs[breadcrumbs.length - 1].name;

  return (
    <div className="flex-1 space-y-2">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-(--sea-ink-soft)">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <span className="text-(--shore-line)">/</span>}
            <button
              onClick={() => navigateTo(i)}
              className={`hover:text-(--lagoon) ${i === breadcrumbs.length - 1 ? "font-semibold text-(--sea-ink)" : ""}`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Select button */}
      <div className="flex gap-2">
        <span className="flex-1 text-xs text-(--sea-ink-soft)">
          {loading ? "Loading..." : `${folders.length} folders in ${currentName}`}
        </span>
        <button
          onClick={() => onSelect(`${provider}:${currentFolderId}`)}
          className="shrink-0 rounded-lg bg-(--lagoon) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          Use this folder
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Folder list */}
      {!error && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-(--shore-line) bg-white dark:bg-[#1e1e1e]">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => navigateInto(folder.id, folder.name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-(--sea-ink) hover:bg-(--foam)"
            >
              <Icon size={14} className="shrink-0 text-(--sea-ink-soft)" />
              <span className="truncate font-medium">{folder.name}</span>
              <ChevronDown size={12} className="ml-auto shrink-0 -rotate-90 text-(--shore-line)" />
            </button>
          ))}
          {!loading && folders.length === 0 && (
            <p className="px-3 py-2 text-xs text-(--sea-ink-soft)">Empty folder</p>
          )}
        </div>
      )}
    </div>
  );
}
