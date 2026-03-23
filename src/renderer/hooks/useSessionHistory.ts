import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SessionListQuery {
  source?: string;
  status?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}

interface AgentSessionSummary {
  id: string;
  source: string;
  sourceIdentifier: string;
  sourceName: string;
  providerId: string;
  mode: "sequential" | "parallel";
  maxConcurrency: number | null;
  initialMessage: string | null;
  status: "running" | "completed" | "failed" | "cancelled";
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  totalCostCents: number;
  tasksTotal: number;
  tasksCompleted: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface SessionListResponse {
  sessions: AgentSessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

interface SessionDetailResponse {
  session: AgentSessionSummary;
}

interface SessionEvent {
  id: string;
  sessionId: string;
  type: string;
  agentIndex: number | null;
  cardId: string | null;
  content: Record<string, unknown>;
  sequence: number;
  timestamp: string;
}

interface SessionEventsResponse {
  events: SessionEvent[];
  total: number;
  limit: number;
  offset: number;
}

export type { AgentSessionSummary, SessionListQuery, SessionEvent };

export function useSessionList(query: SessionListQuery = {}) {
  return useQuery<SessionListResponse>({
    queryKey: ["sessions", query],
    queryFn: () => window.taskpilot.getSessions(query),
  });
}

export function useSessionDetail(sessionId: string) {
  return useQuery<SessionDetailResponse>({
    queryKey: ["sessions", sessionId],
    queryFn: () => window.taskpilot.getSessionDetail(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionEvents(sessionId: string, limit = 100, offset = 0) {
  return useQuery<SessionEventsResponse>({
    queryKey: ["sessions", sessionId, "events", { limit, offset }],
    queryFn: () => window.taskpilot.getSessionEvents(sessionId, limit, offset),
    enabled: !!sessionId,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => window.taskpilot.deleteSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
