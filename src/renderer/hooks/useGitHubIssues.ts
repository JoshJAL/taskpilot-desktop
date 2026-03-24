import { useQuery } from "@tanstack/react-query";
import type { GitHubIssue } from "../types";

export function useGitHubIssues(
  owner: string | null,
  repo: string | null,
  polling: boolean = false,
) {
  return useQuery<GitHubIssue[]>({
    queryKey: ["github", "issues", owner, repo],
    queryFn: () => window.taskpilot.getGitHubIssues(owner!, repo!),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000,
    refetchInterval: polling ? 5000 : false,
  });
}
