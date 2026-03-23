import { useQuery } from "@tanstack/react-query";
import type { GitHubRepo } from "../types";

export function useGitHubRepos(enabled: boolean = true) {
  return useQuery<GitHubRepo[]>({
    queryKey: ["github", "repos"],
    queryFn: () => window.taskpilot.getGitHubRepos(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
