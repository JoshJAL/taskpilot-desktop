import type { GitHubIssue, GitLabIssue } from "../types";

interface GitHubIssueItemProps {
  issue: GitHubIssue;
  onWorkOnThis?: (issue: GitHubIssue) => void;
  isSessionRunning?: boolean;
}

interface GitLabIssueItemProps {
  issue: GitLabIssue;
  onWorkOnThis?: (issue: GitLabIssue) => void;
  isSessionRunning?: boolean;
}

export function GitHubIssueItem({ issue, onWorkOnThis, isSessionRunning }: GitHubIssueItemProps) {
  const totalTasks = issue.taskList?.length ?? 0;
  const doneTasks = issue.taskList?.filter((t) => t.checked).length ?? 0;
  const hasIncompleteTask = issue.taskList?.some((t) => !t.checked) ?? false;

  return (
    <div className="island-shell rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-(--sea-ink)">
            #{issue.number} {issue.title}
          </h3>
          {issue.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label.name}
                  className="rounded-full bg-(--foam) px-2 py-0.5 text-xs text-(--sea-ink-soft)"
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onWorkOnThis && hasIncompleteTask && (
            <button
              onClick={() => onWorkOnThis(issue)}
              disabled={isSessionRunning}
              className="shrink-0 rounded-md bg-(--lagoon) px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              title={isSessionRunning ? "Stop current session first" : "Work on this issue only"}
            >
              Work on this
            </button>
          )}
          {totalTasks > 0 && (
            <span className="shrink-0 text-xs text-(--sea-ink-soft)">
              {doneTasks}/{totalTasks} tasks
            </span>
          )}
        </div>
      </div>

      {issue.body && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-(--sea-ink-soft)">
          {issue.body}
        </p>
      )}

      {totalTasks > 0 && issue.taskList && (
        <div className="mt-3 space-y-1">
          {issue.taskList.map((task, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm text-(--sea-ink-soft)"
            >
              <span
                className={
                  task.checked
                    ? "text-green-600 dark:text-green-400"
                    : "text-(--shore-line)"
                }
              >
                {task.checked ? "\u2713" : "\u25CB"}
              </span>
              <span className={task.checked ? "line-through opacity-60" : ""}>
                {task.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GitLabIssueItem({ issue, onWorkOnThis, isSessionRunning }: GitLabIssueItemProps) {
  const totalTasks = issue.taskList?.length ?? 0;
  const doneTasks = issue.taskList?.filter((t) => t.checked).length ?? 0;
  const hasIncompleteTask = issue.taskList?.some((t) => !t.checked) ?? false;

  return (
    <div className="island-shell rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-(--sea-ink)">
            #{issue.iid} {issue.title}
          </h3>
          {issue.labels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-(--foam) px-2 py-0.5 text-xs text-(--sea-ink-soft)"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onWorkOnThis && hasIncompleteTask && (
            <button
              onClick={() => onWorkOnThis(issue)}
              disabled={isSessionRunning}
              className="shrink-0 rounded-md bg-(--lagoon) px-2 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              title={isSessionRunning ? "Stop current session first" : "Work on this issue only"}
            >
              Work on this
            </button>
          )}
          {totalTasks > 0 && (
            <span className="shrink-0 text-xs text-(--sea-ink-soft)">
              {doneTasks}/{totalTasks} tasks
            </span>
          )}
        </div>
      </div>

      {issue.description && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-(--sea-ink-soft)">
          {issue.description}
        </p>
      )}

      {totalTasks > 0 && issue.taskList && (
        <div className="mt-3 space-y-1">
          {issue.taskList.map((task, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm text-(--sea-ink-soft)"
            >
              <span
                className={
                  task.checked
                    ? "text-green-600 dark:text-green-400"
                    : "text-(--shore-line)"
                }
              >
                {task.checked ? "\u2713" : "\u25CB"}
              </span>
              <span className={task.checked ? "line-through opacity-60" : ""}>
                {task.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
