import { RefreshCw } from "lucide-react";
import { useGitHubIssues } from "../hooks/useGitHubIssues";
import { useGitLabIssues } from "../hooks/useGitLabIssues";
import { GitHubIssueItem, GitLabIssueItem } from "./IssueItem";
import type { GitHubIssue, GitLabIssue } from "../types";

interface GitHubIssuePanelProps {
  source: "github";
  owner: string;
  repo: string;
  repoName: string;
  polling?: boolean;
  onWorkOnThis?: (issue: GitHubIssue) => void;
  isSessionRunning?: boolean;
}

interface GitLabIssuePanelProps {
  source: "gitlab";
  projectId: number;
  projectName: string;
  polling?: boolean;
  onWorkOnThis?: (issue: GitLabIssue) => void;
  isSessionRunning?: boolean;
}

type IssuePanelProps = GitHubIssuePanelProps | GitLabIssuePanelProps;

export function IssuePanel(props: IssuePanelProps) {
  if (props.source === "github") {
    return <GitHubIssuePanel {...props} />;
  }
  return <GitLabIssuePanel {...props} />;
}

function GitHubIssuePanel({
  owner,
  repo,
  repoName,
  polling = false,
  onWorkOnThis,
  isSessionRunning,
}: GitHubIssuePanelProps) {
  const { data: issues, isLoading, error, refetch, isFetching } = useGitHubIssues(owner, repo, polling);

  if (isLoading) {
    return <IssueSkeleton />;
  }

  if (error) {
    return <IssueError message={error.message} />;
  }

  const activeIssues = issues?.filter((i) => i.state === "open") ?? [];

  if (activeIssues.length === 0) {
    return (
      <div className="space-y-3">
        <RefreshBar onRefresh={refetch} isFetching={isFetching} />
        <div className="island-shell rounded-xl p-6 text-center text-sm text-(--sea-ink-soft)">
          No open issues found in &ldquo;{repoName}&rdquo;.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--sea-ink)">
          Open Issues ({activeIssues.length})
        </h3>
        <RefreshButton onRefresh={refetch} isFetching={isFetching} />
      </div>
      {activeIssues.map((issue) => (
        <GitHubIssueItem
          key={issue.number}
          issue={issue}
          onWorkOnThis={onWorkOnThis}
          isSessionRunning={isSessionRunning}
        />
      ))}
    </div>
  );
}

function GitLabIssuePanel({
  projectId,
  projectName,
  polling = false,
  onWorkOnThis,
  isSessionRunning,
}: GitLabIssuePanelProps) {
  const { data: issues, isLoading, error, refetch, isFetching } = useGitLabIssues(projectId, polling);

  if (isLoading) {
    return <IssueSkeleton />;
  }

  if (error) {
    return <IssueError message={error.message} />;
  }

  const activeIssues = issues?.filter((i) => i.state === "opened") ?? [];

  if (activeIssues.length === 0) {
    return (
      <div className="space-y-3">
        <RefreshBar onRefresh={refetch} isFetching={isFetching} />
        <div className="island-shell rounded-xl p-6 text-center text-sm text-(--sea-ink-soft)">
          No open issues found in &ldquo;{projectName}&rdquo;.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--sea-ink)">
          Open Issues ({activeIssues.length})
        </h3>
        <RefreshButton onRefresh={refetch} isFetching={isFetching} />
      </div>
      {activeIssues.map((issue) => (
        <GitLabIssueItem
          key={issue.iid}
          issue={issue}
          onWorkOnThis={onWorkOnThis}
          isSessionRunning={isSessionRunning}
        />
      ))}
    </div>
  );
}

function RefreshButton({ onRefresh, isFetching }: { onRefresh: () => void; isFetching: boolean }) {
  return (
    <button
      onClick={onRefresh}
      disabled={isFetching}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--sea-ink-soft) transition hover:bg-(--foam) hover:text-(--sea-ink) disabled:opacity-50"
      title="Refresh issues"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
      Refresh
    </button>
  );
}

function RefreshBar({ onRefresh, isFetching }: { onRefresh: () => void; isFetching: boolean }) {
  return (
    <div className="flex justify-end">
      <RefreshButton onRefresh={onRefresh} isFetching={isFetching} />
    </div>
  );
}

function IssueSkeleton() {
  return (
    <div className="space-y-3">
      {["skeleton-1", "skeleton-2", "skeleton-3"].map((id) => (
        <div key={id} className="island-shell h-24 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}

function IssueError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
      Failed to load issues: {message}
    </div>
  );
}
