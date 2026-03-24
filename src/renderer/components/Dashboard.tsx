import { useState, useCallback, useEffect, useRef } from "react";
import { Sidebar, type SourceView } from "./Sidebar";
import { BoardPanel } from "./BoardPanel";
import { IssuePanel } from "./IssuePanel";
import { SessionLog } from "./SessionLog";
import { SessionControls } from "./SessionControls";
import { SettingsPage } from "./SettingsPage";
import { HistoryPage } from "./HistoryPage";
import { RoadmapPage } from "./RoadmapPage";
import { useSession } from "../hooks/useSession";
import { useBoardData } from "../hooks/useBoardData";
import { useGitHubIssues } from "../hooks/useGitHubIssues";
import { useGitLabIssues } from "../hooks/useGitLabIssues";
import { useToast } from "./Toast";
import type { TrelloCard, GitHubIssue, GitLabIssue, BoardData, AiProviderId } from "../types";

interface DashboardProps {
  session: Record<string, unknown>;
  onLogout: () => void;
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const user = session.user as { name?: string; email?: string } | undefined;
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<SourceView>(null);
  const [cwd, setCwd] = useState("");

  const {
    isRunning,
    logs,
    error: sessionError,
    pendingQuestion,
    prResult,
    start,
    stop,
    sendMessage,
    reset,
  } = useSession();

  // Derive a stable key for the current view
  const viewKey = activeView && "source" in activeView
    ? activeView.source === "trello" ? `trello:${activeView.boardId}`
      : activeView.source === "github" ? `github:${activeView.owner}/${activeView.repo}`
      : activeView.source === "gitlab" ? `gitlab:${activeView.projectId}`
      : null
    : null;

  // Clear session state when switching between tabs (unless a session is running)
  const prevViewKey = useRef(viewKey);
  useEffect(() => {
    if (prevViewKey.current !== viewKey && !isRunning) {
      reset();
    }
    prevViewKey.current = viewKey;
  }, [viewKey, isRunning, reset]);

  // Load persisted settings
  useEffect(() => {
    window.taskpilot.getSettings().then((s: { sidebarCollapsed?: boolean; lastCwd?: string }) => {
      if (s.sidebarCollapsed) setCollapsed(true);
      if (s.lastCwd) setCwd(s.lastCwd);
    });
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.taskpilot.updateSettings({ sidebarCollapsed: next });
      return next;
    });
  }, []);

  // Persist cwd when it changes
  const handleCwdChange = useCallback((newCwd: string) => {
    setCwd(newCwd);
    if (newCwd) {
      window.taskpilot.updateSettings({ lastCwd: newCwd });
    }
  }, []);

  async function handleLogout() {
    await window.taskpilot.logout();
    onLogout();
  }

  const currentBoardId =
    activeView && "source" in activeView && activeView.source === "trello" && "boardId" in activeView
      ? activeView.boardId
      : null;

  const { data: boardData } = useBoardData(currentBoardId, isRunning);

  const currentGitHubOwner =
    activeView && "source" in activeView && activeView.source === "github" ? activeView.owner : null;
  const currentGitHubRepo =
    activeView && "source" in activeView && activeView.source === "github" ? activeView.repo : null;
  const currentGitLabProjectId =
    activeView && "source" in activeView && activeView.source === "gitlab" ? activeView.projectId : null;

  const { data: githubIssues } = useGitHubIssues(currentGitHubOwner, currentGitHubRepo, isRunning);
  const { data: gitlabIssues } = useGitLabIssues(currentGitLabProjectId, isRunning);

  const activeCardCount = boardData
    ? boardData.cards.filter((c) => c.idList !== boardData.doneListId).length
    : (githubIssues?.filter((i) => i.state === "open").length ?? gitlabIssues?.filter((i) => i.state === "opened").length ?? 0);

  function handleStartSession(opts: {
    cwd: string;
    userMessage?: string;
    mode: "sequential" | "parallel";
    concurrency: number;
    providerId: AiProviderId;
    webMode?: boolean;
    linkedRepo?: { owner: string; repo: string };
    linkedGitlabProjectId?: number;
    selectedBranch?: string;
    linkedWorkspace?: { provider: "google" | "onedrive"; folderId: string };
  }) {
    if (!activeView || !("source" in activeView)) return;

    let sessionBoardData: BoardData;
    let source: "trello" | "github" | "gitlab";
    let githubOwner: string | undefined;
    let githubRepo: string | undefined;
    let gitlabProjectId: number | undefined;

    if (activeView.source === "trello") {
      if (!boardData) return;
      sessionBoardData = {
        board: { id: activeView.boardId, name: activeView.boardName },
        cards: boardData.cards,
        doneListId: boardData.doneListId ?? undefined,
      };
      source = "trello";
      githubOwner = opts.linkedRepo?.owner;
      githubRepo = opts.linkedRepo?.repo;
      gitlabProjectId = opts.linkedGitlabProjectId;
    } else if (activeView.source === "github") {
      const openIssues = githubIssues?.filter((i) => i.state === "open") ?? [];
      sessionBoardData = {
        board: { id: `github:${activeView.owner}/${activeView.repo}`, name: activeView.repoName },
        cards: openIssues.map((issue) => ({
          id: String(issue.number),
          name: issue.title,
          desc: issue.body ?? "",
          checklists: issue.taskList?.length
            ? [{
                id: "tasks",
                name: "Tasks",
                checkItems: issue.taskList.map((t, idx) => ({
                  id: `task-${idx}`,
                  name: t.text,
                  state: t.checked ? "complete" as const : "incomplete" as const,
                })),
              }]
            : [],
        })),
      };
      source = "github";
      githubOwner = activeView.owner;
      githubRepo = activeView.repo;
    } else if (activeView.source === "gitlab") {
      const openIssues = gitlabIssues?.filter((i) => i.state === "opened") ?? [];
      sessionBoardData = {
        board: { id: `gitlab:${activeView.projectId}`, name: activeView.projectName },
        cards: openIssues.map((issue) => ({
          id: String(issue.iid),
          name: issue.title,
          desc: issue.description ?? "",
          checklists: issue.taskList?.length
            ? [{
                id: "tasks",
                name: "Tasks",
                checkItems: issue.taskList.map((t, idx) => ({
                  id: `task-${idx}`,
                  name: t.text,
                  state: t.checked ? "complete" as const : "incomplete" as const,
                })),
              }]
            : [],
        })),
      };
      source = "gitlab";
      gitlabProjectId = activeView.projectId;
    } else {
      return;
    }

    // Persist the cwd for future sessions
    if (opts.cwd) handleCwdChange(opts.cwd);

    start(sessionBoardData, {
      cwd: opts.cwd || undefined,
      userMessage: opts.userMessage,
      providerId: opts.providerId,
      source,
      mode: opts.mode,
      maxConcurrency: opts.concurrency,
      webMode: opts.webMode,
      githubOwner,
      githubRepo,
      gitlabProjectId,
      selectedBranch: opts.selectedBranch,
      workspaceProvider: opts.linkedWorkspace?.provider,
      workspaceFolderId: opts.linkedWorkspace?.folderId,
    });
  }

  async function handleWorkOnCard(card: TrelloCard) {
    if (!activeView || !("source" in activeView) || activeView.source !== "trello") return;
    if (!boardData) return;

    // Need a project directory for local mode
    let workingDir = cwd;
    if (!workingDir) {
      workingDir = await window.taskpilot.selectDirectory() as string;
      if (!workingDir) {
        toast("info", "Select a project directory to start a session");
        return;
      }
      handleCwdChange(workingDir);
    }

    const singleCardBoardData: BoardData = {
      board: { id: activeView.boardId, name: activeView.boardName },
      cards: [card],
      doneListId: boardData.doneListId ?? undefined,
    };

    start(singleCardBoardData, {
      cwd: workingDir,
      source: "trello",
    });
  }

  async function handleWorkOnGitHubIssue(issue: GitHubIssue) {
    if (!activeView || !("source" in activeView) || activeView.source !== "github") return;

    let workingDir = cwd;
    if (!workingDir) {
      workingDir = await window.taskpilot.selectDirectory() as string;
      if (!workingDir) {
        toast("info", "Select a project directory to start a session");
        return;
      }
      handleCwdChange(workingDir);
    }

    const singleIssueBoardData: BoardData = {
      board: { id: `github:${activeView.owner}/${activeView.repo}`, name: activeView.repoName },
      cards: [{
        id: String(issue.number),
        name: issue.title,
        desc: issue.body ?? "",
        checklists: issue.taskList?.length
          ? [{
              id: "tasks",
              name: "Tasks",
              checkItems: issue.taskList.map((t, idx) => ({
                id: `task-${idx}`,
                name: t.text,
                state: t.checked ? "complete" as const : "incomplete" as const,
              })),
            }]
          : [],
      }],
    };

    start(singleIssueBoardData, {
      cwd: workingDir,
      source: "github",
      githubOwner: activeView.owner,
      githubRepo: activeView.repo,
    });
  }

  async function handleWorkOnGitLabIssue(issue: GitLabIssue) {
    if (!activeView || !("source" in activeView) || activeView.source !== "gitlab") return;

    let workingDir = cwd;
    if (!workingDir) {
      workingDir = await window.taskpilot.selectDirectory() as string;
      if (!workingDir) {
        toast("info", "Select a project directory to start a session");
        return;
      }
      handleCwdChange(workingDir);
    }

    const singleIssueBoardData: BoardData = {
      board: { id: `gitlab:${activeView.projectId}`, name: activeView.projectName },
      cards: [{
        id: String(issue.iid),
        name: issue.title,
        desc: issue.description ?? "",
        checklists: issue.taskList?.length
          ? [{
              id: "tasks",
              name: "Tasks",
              checkItems: issue.taskList.map((t, idx) => ({
                id: `task-${idx}`,
                name: t.text,
                state: t.checked ? "complete" as const : "incomplete" as const,
              })),
            }]
          : [],
      }],
    };

    start(singleIssueBoardData, {
      cwd: workingDir,
      source: "gitlab",
      gitlabProjectId: activeView.projectId,
    });
  }

  const canStart = !!activeView && "source" in activeView && activeView.source !== "settings" && activeView.source !== "history" && activeView.source !== "roadmap";

  return (
    <div className="flex h-screen bg-(--sand)">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        activeView={activeView}
        onSelectView={setActiveView}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Settings page */}
        {activeView && "source" in activeView && activeView.source === "settings" && (
          <div className="flex-1 overflow-y-auto p-6">
            <SettingsPage />
          </div>
        )}

        {/* History page */}
        {activeView && "source" in activeView && activeView.source === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
            <HistoryPage />
          </div>
        )}

        {/* Roadmap page */}
        {activeView && "source" in activeView && activeView.source === "roadmap" && (
          <div className="flex-1 overflow-y-auto p-6">
            <RoadmapPage />
          </div>
        )}

        {/* No selection */}
        {!activeView && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-lg font-semibold text-(--sea-ink)">
                Welcome to TaskPilot Desktop
              </h2>
              <p className="text-sm text-(--sea-ink-soft)">
                Select a board, repo, or project from the sidebar to get started.
              </p>
            </div>
          </div>
        )}

        {/* Active source view */}
        {activeView && "source" in activeView && activeView.source !== "settings" && activeView.source !== "history" && activeView.source !== "roadmap" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-(--shore-line) bg-(--sand) px-6 py-3">
              <h1 className="text-lg font-bold text-(--sea-ink)">
                {activeView.source === "trello" && activeView.boardName}
                {activeView.source === "github" && activeView.repoName}
                {activeView.source === "gitlab" && activeView.projectName}
              </h1>
            </div>

            {/* Session controls (sticky) */}
            <div className="border-b border-(--shore-line) bg-(--sand) px-6 py-3">
              <SessionControls
                isRunning={isRunning}
                canStart={canStart}
                activeCardCount={activeCardCount}
                source={activeView.source}
                githubOwner={activeView.source === "github" ? activeView.owner : undefined}
                githubRepo={activeView.source === "github" ? activeView.repo : undefined}
                gitlabProjectId={activeView.source === "gitlab" ? activeView.projectId : undefined}
                onStart={handleStartSession}
                onStop={stop}
                cwd={cwd}
                onCwdChange={handleCwdChange}
              />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Session log — shown first so it's always visible during a session */}
              <SessionLog
                logs={logs}
                isRunning={isRunning}
                pendingQuestion={pendingQuestion}
                onSendMessage={sendMessage}
                providerLabel="the agent"
              />

              {/* Board panel (Trello only for now) */}
              {activeView.source === "trello" && (
                <BoardPanel
                  boardId={activeView.boardId}
                  boardName={activeView.boardName}
                  polling={isRunning}
                  onWorkOnThis={handleWorkOnCard}
                  isSessionRunning={isRunning}
                />
              )}

              {/* GitHub issues */}
              {activeView.source === "github" && (
                <IssuePanel
                  source="github"
                  owner={activeView.owner}
                  repo={activeView.repo}
                  repoName={activeView.repoName}
                  polling={isRunning}
                  onWorkOnThis={handleWorkOnGitHubIssue}
                  isSessionRunning={isRunning}
                />
              )}

              {/* GitLab issues */}
              {activeView.source === "gitlab" && (
                <IssuePanel
                  source="gitlab"
                  projectId={activeView.projectId}
                  projectName={activeView.projectName}
                  polling={isRunning}
                  onWorkOnThis={handleWorkOnGitLabIssue}
                  isSessionRunning={isRunning}
                />
              )}

              {/* PR result */}
              {prResult && (
                <div className="island-shell rounded-xl p-4">
                  <h3 className="mb-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                    Pull Request Created
                  </h3>
                  <a
                    href={prResult.url}
                    className="text-sm text-(--lagoon) underline"
                  >
                    #{prResult.number} — {prResult.title}
                    {prResult.draft && " (draft)"}
                  </a>
                </div>
              )}

              {/* Session error */}
              {sessionError && !isRunning && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                  {sessionError}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
