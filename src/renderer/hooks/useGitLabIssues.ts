import { useQuery } from "@tanstack/react-query";
import type { GitLabIssue } from "../types";

export function useGitLabIssues(
  projectId: number | null,
  polling: boolean = false,
) {
  return useQuery<GitLabIssue[]>({
    queryKey: ["gitlab", "issues", projectId],
    queryFn: () => window.taskpilot.getGitLabIssues(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: polling ? 5000 : false,
  });
}
