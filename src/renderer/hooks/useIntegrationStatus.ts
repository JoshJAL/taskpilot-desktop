import { useQuery } from "@tanstack/react-query";
import type { IntegrationStatus, AiProviderId } from "../types";
import { PROVIDER_ORDER } from "../types";

export function useIntegrationStatus() {
  const { data, isLoading, refetch } = useQuery<IntegrationStatus>({
    queryKey: ["settings", "status"],
    queryFn: () => window.taskpilot.getIntegrationStatus(),
  });

  const configuredProviders: AiProviderId[] =
    (data?.configuredProviders ?? []).sort(
      (a, b) => PROVIDER_ORDER.indexOf(a) - PROVIDER_ORDER.indexOf(b),
    );

  const trelloLinked = data?.trelloLinked ?? false;
  const githubLinked = data?.githubLinked ?? false;
  const gitlabLinked = data?.gitlabLinked ?? false;
  const googleDriveLinked = data?.googleDriveLinked ?? false;
  const oneDriveLinked = data?.oneDriveLinked ?? false;
  const hasApiKey = data?.hasApiKey ?? false;
  const hasTaskSource = trelloLinked || githubLinked || gitlabLinked;
  const hasWorkspace = githubLinked || gitlabLinked || googleDriveLinked || oneDriveLinked;

  return {
    trelloLinked,
    githubLinked,
    gitlabLinked,
    googleDriveLinked,
    oneDriveLinked,
    hasApiKey,
    configuredProviders,
    hasTaskSource,
    hasWorkspace,
    isReady: hasTaskSource && hasApiKey,
    isLoading,
    refetch,
  };
}
