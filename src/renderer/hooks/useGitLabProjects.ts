import { useQuery } from "@tanstack/react-query";
import type { GitLabProject } from "../types";

export function useGitLabProjects(enabled: boolean = true) {
  return useQuery<GitLabProject[]>({
    queryKey: ["gitlab", "projects"],
    queryFn: () => window.taskpilot.getGitLabProjects(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
