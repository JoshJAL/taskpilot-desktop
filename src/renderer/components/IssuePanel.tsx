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
  const { data: issues, isLoading, error } = useGitHubIssues(owner, repo, polling);

  if (isLoading) {
    return <IssueSkeleton />;
  }

  if (error) {
    return <IssueError message={error.message} />;
  }

  const activeIssues = issues?.filter((i) => i.state === "open") ?? [];

  if (activeIssues.length === 0) {
    return (
      <div className="island-shell rounded-xl p-6 text-center text-sm text-(--sea-ink-soft)">
        No open issues found in &ldquo;{repoName}&rdquo;.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-(--sea-ink)">
        Open Issues ({activeIssues.length})
      </h3>
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
  const { data: issues, isLoading, error } = useGitLabIssues(projectId, polling);

  if (isLoading) {
    return <IssueSkeleton />;
  }

  if (error) {
    return <IssueError message={error.message} />;
  }

  const activeIssues = issues?.filter((i) => i.state === "opened") ?? [];

  if (activeIssues.length === 0) {
    return (
      <div className="island-shell rounded-xl p-6 text-center text-sm text-(--sea-ink-soft)">
        No open issues found in &ldquo;{projectName}&rdquo;.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-(--sea-ink)">
        Open Issues ({activeIssues.length})
      </h3>
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
