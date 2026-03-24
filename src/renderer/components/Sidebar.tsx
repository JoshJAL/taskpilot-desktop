import { useState, useCallback } from "react";
import {
  Terminal,
  Trello,
  Github,
  Gitlab,
  Settings,
  History,
  Map,
  BookOpen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
  ChevronDown,
} from "lucide-react";
import { useBoards } from "../hooks/useBoardData";
import { useGitHubRepos } from "../hooks/useGitHubRepos";
import { useGitLabProjects } from "../hooks/useGitLabProjects";
import { useIntegrationStatus } from "../hooks/useIntegrationStatus";
import { ThemeToggle } from "./ThemeToggle";
import type { TrelloBoard, GitHubRepo, GitLabProject } from "../types";

export type SourceView =
  | { source: "trello"; boardId: string; boardName: string }
  | { source: "github"; owner: string; repo: string; repoName: string }
  | { source: "gitlab"; projectId: number; projectName: string }
  | { source: "history" }
  | { source: "roadmap" }
  | { source: "ai-docs" }
  | { source: "settings" }
  | null;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: SourceView;
  onSelectView: (view: SourceView) => void;
  user: { name?: string; email?: string } | undefined;
  onLogout: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  activeView,
  onSelectView,
  user,
  onLogout,
}: SidebarProps) {
  const { trelloLinked, githubLinked, gitlabLinked } = useIntegrationStatus();
  const { data: boards } = useBoards();
  const { data: ghRepos } = useGitHubRepos(githubLinked);
  const { data: glProjects } = useGitLabProjects(gitlabLinked);

  const [expandedSection, setExpandedSection] = useState<string | null>(
    activeView && "source" in activeView ? activeView.source : "trello",
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  return (
    <aside
      className={`flex flex-col border-r border-(--shore-line) bg-(--sand) transition-all ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-(--shore-line) ${collapsed ? "flex-col gap-1 px-2 py-3" : "gap-2 px-3 py-3"}`}>
        {!collapsed && (
          <>
            <Terminal size={18} className="shrink-0 text-(--lagoon)" />
            <span className="font-bold text-(--sea-ink)">TaskPilot</span>
            <div className="flex-1" />
          </>
        )}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center rounded p-1.5 text-(--sea-ink-soft) hover:bg-(--foam) hover:text-(--sea-ink)"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Sources */}
      <div className="flex-1 overflow-y-auto px-2 pt-3">
        {!collapsed && (
          <span className="mb-2 block px-2 text-[10px] font-semibold uppercase tracking-wider text-(--sea-ink-soft)">
            Sources
          </span>
        )}

        {/* Trello */}
        {trelloLinked && (
          <SourceSection
            icon={Trello}
            label="Trello"
            collapsed={collapsed}
            expanded={expandedSection === "trello"}
            onToggle={() => toggleSection("trello")}
            isActive={activeView !== null && "source" in activeView && activeView.source === "trello"}
          >
            {boards?.map((board: TrelloBoard) => (
              <SidebarItem
                key={board.id}
                label={board.name}
                active={
                  activeView !== null &&
                  "source" in activeView &&
                  activeView.source === "trello" &&
                  "boardId" in activeView &&
                  activeView.boardId === board.id
                }
                onClick={() =>
                  onSelectView({ source: "trello", boardId: board.id, boardName: board.name })
                }
              />
            ))}
            {(!boards || boards.length === 0) && (
              <p className="px-2 py-1 text-xs text-(--shore-line)">No boards</p>
            )}
          </SourceSection>
        )}

        {/* GitHub */}
        {githubLinked && (
          <SourceSection
            icon={Github}
            label="GitHub"
            collapsed={collapsed}
            expanded={expandedSection === "github"}
            onToggle={() => toggleSection("github")}
            isActive={activeView !== null && "source" in activeView && activeView.source === "github"}
          >
            {ghRepos?.map((repo: GitHubRepo) => (
              <SidebarItem
                key={repo.id}
                label={repo.full_name}
                active={
                  activeView !== null &&
                  "source" in activeView &&
                  activeView.source === "github" &&
                  "repo" in activeView &&
                  activeView.repo === repo.name
                }
                onClick={() =>
                  onSelectView({
                    source: "github",
                    owner: repo.owner.login,
                    repo: repo.name,
                    repoName: repo.full_name,
                  })
                }
              />
            ))}
            {(!ghRepos || ghRepos.length === 0) && (
              <p className="px-2 py-1 text-xs text-(--shore-line)">No repos</p>
            )}
          </SourceSection>
        )}

        {/* GitLab */}
        {gitlabLinked && (
          <SourceSection
            icon={Gitlab}
            label="GitLab"
            collapsed={collapsed}
            expanded={expandedSection === "gitlab"}
            onToggle={() => toggleSection("gitlab")}
            isActive={activeView !== null && "source" in activeView && activeView.source === "gitlab"}
          >
            {glProjects?.map((project: GitLabProject) => (
              <SidebarItem
                key={project.id}
                label={project.path_with_namespace}
                active={
                  activeView !== null &&
                  "source" in activeView &&
                  activeView.source === "gitlab" &&
                  "projectId" in activeView &&
                  activeView.projectId === project.id
                }
                onClick={() =>
                  onSelectView({
                    source: "gitlab",
                    projectId: project.id,
                    projectName: project.path_with_namespace,
                  })
                }
              />
            ))}
            {(!glProjects || glProjects.length === 0) && (
              <p className="px-2 py-1 text-xs text-(--shore-line)">No projects</p>
            )}
          </SourceSection>
        )}

        {/* No sources connected */}
        {!trelloLinked && !githubLinked && !gitlabLinked && !collapsed && (
          <p className="px-2 py-3 text-xs text-(--shore-line)">
            No task sources connected. Go to Settings to connect Trello, GitHub, or GitLab.
          </p>
        )}
      </div>

      {/* Bottom section */}
      <div className={`border-t border-(--shore-line) p-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {/* History */}
        <button
          onClick={() => onSelectView({ source: "history" })}
          className={`sidebar-link ${collapsed ? "justify-center" : "w-full"} ${activeView !== null && "source" in activeView && activeView.source === "history" ? "is-active" : ""}`}
          title="History"
        >
          <History size={18} className="shrink-0" />
          {!collapsed && <span>History</span>}
        </button>

        {/* Roadmap */}
        <button
          onClick={() => onSelectView({ source: "roadmap" })}
          className={`sidebar-link ${collapsed ? "justify-center" : "w-full"} ${activeView !== null && "source" in activeView && activeView.source === "roadmap" ? "is-active" : ""}`}
          title="Roadmap"
        >
          <Map size={18} className="shrink-0" />
          {!collapsed && <span>Roadmap</span>}
        </button>

        {/* AI Docs */}
        <button
          onClick={() => onSelectView({ source: "ai-docs" })}
          className={`sidebar-link ${collapsed ? "justify-center" : "w-full"} ${activeView !== null && "source" in activeView && activeView.source === "ai-docs" ? "is-active" : ""}`}
          title="AI Docs"
        >
          <BookOpen size={18} className="shrink-0" />
          {!collapsed && <span>AI Docs</span>}
        </button>

        {/* Settings */}
        <button
          onClick={() => onSelectView({ source: "settings" })}
          className={`sidebar-link ${collapsed ? "justify-center" : "w-full"} ${activeView !== null && "source" in activeView && activeView.source === "settings" ? "is-active" : ""}`}
          title="Settings"
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        <ThemeToggle />

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <UserCircle size={16} className="shrink-0 text-(--sea-ink-soft)" />
            <span className="truncate text-xs font-medium text-(--sea-ink-soft)">
              {user?.name ?? user?.email ?? "Signed in"}
            </span>
          </div>
        )}

        <button
          onClick={onLogout}
          className={`sidebar-link ${collapsed ? "justify-center" : "w-full"}`}
          title="Sign out"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function SourceSection({
  icon: Icon,
  label,
  collapsed,
  expanded,
  onToggle,
  isActive,
  children,
}: {
  icon: typeof Trello;
  label: string;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={`sidebar-link w-full ${isActive ? "is-active" : ""}`}
        title={collapsed ? label : undefined}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown
              size={14}
              className={`shrink-0 text-(--shore-line) transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
          </>
        )}
      </button>
      {!collapsed && expanded && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-(--shore-line) pl-2.5">
          {children}
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-xs transition ${
        active
          ? "bg-(--link-bg-hover) font-semibold text-(--sea-ink)"
          : "text-(--sea-ink-soft) hover:bg-(--foam) hover:text-(--sea-ink)"
      }`}
    >
      {label}
    </button>
  );
}
