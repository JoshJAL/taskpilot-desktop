import { useState } from "react";
import {
  useSessionList,
  useDeleteSession,
  useSessionDetail,
  useSessionEvents,
} from "../hooks/useSessionHistory";
import type { AgentSessionSummary, SessionEvent } from "../hooks/useSessionHistory";
import {
  Trello,
  Github,
  Gitlab,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  Trash2,
  ArrowLeft,
  Coins,
  Cpu,
  ListChecks,
} from "lucide-react";

type SessionStatus = "running" | "completed" | "failed" | "cancelled";

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "trello", label: "Trello" },
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "running", label: "Running" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "costliest", label: "Most expensive" },
];

export function HistoryPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  if (selectedSessionId) {
    return (
      <SessionDetailView
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return <SessionListView onSelectSession={setSelectedSessionId} />;
}

// ── Session List ──────────────────────────────────────────────────────

function SessionListView({ onSelectSession }: { onSelectSession: (id: string) => void }) {
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useSessionList({
    source: source || undefined,
    status: status || undefined,
    sort,
    limit,
    offset: page * limit,
  });

  const deleteMutation = useDeleteSession();
  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  function handleDelete(id: string) {
    if (window.confirm("Delete this session? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-xl font-bold text-(--sea-ink)">
        Session History
      </h1>
      <p className="mb-6 text-sm text-(--sea-ink-soft)">
        View past AI agent sessions and their results.
      </p>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(0); }}
          className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-1.5 text-sm text-(--sea-ink) dark:bg-white/5"
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-1.5 text-sm text-(--sea-ink) dark:bg-white/5"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(0); }}
          className="rounded-lg border border-(--shore-line) bg-white/60 px-3 py-1.5 text-sm text-(--sea-ink) dark:bg-white/5"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-(--foam)" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load sessions: {error.message}
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !error && sessions.length === 0 && (
        <p className="text-sm text-(--sea-ink-soft)">
          No sessions yet. Start one from the dashboard.
        </p>
      )}

      {/* Session list */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onClick={() => onSelectSession(s.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-(--shore-line) px-3 py-1.5 text-sm text-(--sea-ink) disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-(--sea-ink-soft)">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-(--shore-line) px-3 py-1.5 text-sm text-(--sea-ink) disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function SessionRow({
  session,
  onClick,
  onDelete,
}: {
  session: AgentSessionSummary;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-(--shore-line) bg-white/60 px-4 py-3 transition hover:border-(--lagoon) dark:bg-white/5">
      <button onClick={onClick} className="flex flex-1 items-center gap-4 text-left">
        <div className="text-(--sea-ink-soft)">
          <SourceIcon source={session.source} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-(--sea-ink)">
            {session.sourceName}
          </span>
          <span className="text-xs text-(--sea-ink-soft)">
            {session.providerId} / {session.mode}
            {session.mode === "parallel" && session.maxConcurrency
              ? ` (${session.maxConcurrency}x)`
              : ""}
          </span>
        </div>

        <StatusBadge status={session.status} />

        <span className="hidden text-xs text-(--sea-ink-soft) sm:block">
          {session.tasksCompleted}/{session.tasksTotal} tasks
        </span>

        <span className="hidden text-xs text-(--sea-ink-soft) md:block">
          {formatCost(session.totalCostCents)}
        </span>

        <span className="hidden items-center gap-1 text-xs text-(--sea-ink-soft) lg:flex">
          <Clock size={12} />
          {formatDuration(session.durationMs)}
        </span>

        <span className="hidden text-xs text-(--sea-ink-soft) xl:block">
          {formatDate(session.startedAt)}
        </span>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
        className="shrink-0 rounded-lg p-1.5 text-(--sea-ink-soft) transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        title="Delete session"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── Session Detail ────────────────────────────────────────────────────

function SessionDetailView({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useSessionDetail(sessionId);
  const [eventsPage, setEventsPage] = useState(0);
  const eventsLimit = 100;
  const { data: eventsData } = useSessionEvents(sessionId, eventsLimit, eventsPage * eventsLimit);

  const session = data?.session;
  const events = eventsData?.events ?? [];
  const eventsTotal = eventsData?.total ?? 0;
  const eventsTotalPages = Math.ceil(eventsTotal / eventsLimit);

  if (isLoading || !session) {
    return (
      <div className="mx-auto max-w-4xl">
        <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-(--lagoon) hover:underline">
          <ArrowLeft size={14} /> Back to history
        </button>
        <div className="h-40 animate-pulse rounded-xl bg-(--foam)" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-(--lagoon) hover:underline">
        <ArrowLeft size={14} /> Back to history
      </button>

      <div className="island-shell rounded-xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <SourceIcon source={session.source} />
          <h1 className="text-lg font-bold text-(--sea-ink)">{session.sourceName}</h1>
          <StatusBadge status={session.status} />
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard icon={Cpu} label="Provider" value={session.providerId} />
          <MetricCard
            icon={ListChecks}
            label="Tasks"
            value={`${session.tasksCompleted}/${session.tasksTotal}`}
          />
          <MetricCard icon={Clock} label="Duration" value={formatDuration(session.durationMs)} />
          <MetricCard icon={Coins} label="Cost" value={formatCost(session.totalCostCents)} />
        </div>

        {/* Tokens */}
        <div className="mt-3 flex gap-4 text-xs text-(--sea-ink-soft)">
          <span>Input: {session.inputTokens.toLocaleString()} tokens</span>
          <span>Output: {session.outputTokens.toLocaleString()} tokens</span>
          <span>Started: {formatDate(session.startedAt)}</span>
        </div>

        {/* Error */}
        {session.errorMessage && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {session.errorMessage}
          </div>
        )}

        {/* Initial message */}
        {session.initialMessage && (
          <div className="mt-3">
            <span className="text-xs font-medium text-(--sea-ink-soft)">Initial message:</span>
            <p className="mt-1 rounded-lg bg-(--foam) px-3 py-2 text-sm text-(--sea-ink)">
              {session.initialMessage}
            </p>
          </div>
        )}
      </div>

      {/* Event log */}
      <div className="island-shell rounded-xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-(--sea-ink)">
          Event Log ({eventsTotal} events)
        </h2>

        <div className="max-h-[calc(100vh-20rem)] space-y-1 overflow-y-auto rounded-lg bg-(--foam) p-3 font-mono text-xs">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
          {events.length === 0 && (
            <p className="text-(--sea-ink-soft)">No events recorded.</p>
          )}
        </div>

        {/* Event pagination */}
        {eventsTotalPages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setEventsPage((p) => Math.max(0, p - 1))}
              disabled={eventsPage === 0}
              className="rounded-lg border border-(--shore-line) px-3 py-1 text-xs text-(--sea-ink) disabled:opacity-40"
            >
              Newer
            </button>
            <span className="text-xs text-(--sea-ink-soft)">
              Page {eventsPage + 1} of {eventsTotalPages}
            </span>
            <button
              onClick={() => setEventsPage((p) => Math.min(eventsTotalPages - 1, p + 1))}
              disabled={eventsPage >= eventsTotalPages - 1}
              className="rounded-lg border border-(--shore-line) px-3 py-1 text-xs text-(--sea-ink) disabled:opacity-40"
            >
              Older
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: SessionEvent }) {
  const typeColor = EVENT_TYPE_COLORS[event.type] ?? "text-(--sea-ink-soft)";
  const summary = summarizeEvent(event);

  return (
    <div className={typeColor}>
      <span className="mr-2 text-(--sea-ink-soft)">
        {new Date(event.timestamp).toLocaleTimeString()}
      </span>
      {event.agentIndex !== null && (
        <span className="mr-1.5 rounded bg-(--lagoon)/20 px-1 py-0.5 text-[10px] font-bold text-(--lagoon)">
          A{event.agentIndex}
        </span>
      )}
      <span className="whitespace-pre-wrap break-words">{summary}</span>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-(--foam) px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1.5 text-xs text-(--sea-ink-soft)">
        <Icon size={12} /> {label}
      </div>
      <div className="text-sm font-semibold text-(--sea-ink)">{value}</div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<string, string> = {
  assistant: "text-(--sea-ink)",
  tool_use: "text-blue-600 dark:text-blue-400",
  tool_result: "text-green-900 dark:text-green-400 font-medium",
  task_completed: "text-emerald-700 dark:text-emerald-400 font-medium",
  error: "text-red-600 dark:text-red-400",
  system: "text-(--sea-ink-soft) italic",
  user: "text-(--lagoon) font-medium",
  agent_started: "text-blue-600 dark:text-blue-400 font-medium",
  agent_completed: "text-green-600 dark:text-green-400 font-medium",
  merge_result: "text-purple-600 dark:text-purple-400",
};

function summarizeEvent(event: SessionEvent): string {
  const c = event.content;
  if (!c) return event.type;

  if (typeof c.text === "string") {
    return c.text.length > 200 ? c.text.slice(0, 200) + "..." : c.text;
  }
  if (typeof c.content === "string") {
    return c.content.length > 200 ? c.content.slice(0, 200) + "..." : c.content;
  }
  if (event.type === "tool_use" && c.toolName) {
    const input = JSON.stringify(c.toolInput ?? {});
    const truncated = input.length > 100 ? input.slice(0, 100) + "..." : input;
    return `${c.toolName}(${truncated})`;
  }
  if (event.type === "tool_result" && c.toolName) {
    const result = String(c.toolResult ?? "");
    const truncated = result.length > 150 ? result.slice(0, 150) + "..." : result;
    return `${c.toolName} -> ${truncated}`;
  }
  if (event.type === "error" && c.error) {
    return `Error: ${c.error}`;
  }
  if (event.type === "done") {
    return "Session finished";
  }

  const json = JSON.stringify(c);
  return json.length > 150 ? json.slice(0, 150) + "..." : json;
}

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case "github":
      return <Github size={16} />;
    case "gitlab":
      return <Gitlab size={16} />;
    default:
      return <Trello size={16} />;
  }
}

function StatusBadge({ status }: { status: SessionStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle size={12} /> Failed
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Ban size={12} /> Cancelled
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Loader2 size={12} className="animate-spin" /> Running
        </span>
      );
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(cents: number): string {
  if (cents === 0) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
