// Re-export types used by renderer components.
// These mirror the main process types but are used in the renderer context.

export type AiProviderId = "claude" | "openai" | "groq";

export const PROVIDER_SHORT_LABELS: Record<AiProviderId, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  groq: "Groq",
};

export interface IntegrationStatus {
  trelloLinked: boolean;
  githubLinked: boolean;
  gitlabLinked: boolean;
  googleDriveLinked: boolean;
  oneDriveLinked: boolean;
  hasApiKey: boolean;
  configuredProviders: AiProviderId[];
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList?: string;
  pos?: number;
  checklists: TrelloChecklist[];
}

export interface TrelloChecklist {
  id: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete" | string;
  pos?: number;
}

export interface BoardData {
  board: { id: string; name: string };
  cards: TrelloCard[];
  doneListId?: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  owner: { login: string };
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{ name: string }>;
  taskList?: Array<{ text: string; checked: boolean }>;
}

export interface GitLabProject {
  id: number;
  path_with_namespace: string;
  name: string;
  description: string | null;
  web_url: string;
  visibility: "public" | "internal" | "private";
  namespace: { full_path: string };
}

export interface GitLabIssue {
  iid: number;
  title: string;
  description: string | null;
  web_url: string;
  state: string;
  labels: string[];
  taskList?: Array<{ text: string; checked: boolean }>;
}

export interface SessionLogEntry {
  id: number;
  type: string;
  content: string;
  timestamp: number;
}

export interface SessionStartOptions {
  cwd: string;
  userMessage?: string;
  mode: "sequential" | "parallel";
  concurrency: number;
  providerId: AiProviderId;
  webMode?: boolean;
  linkedRepo?: { owner: string; repo: string };
  linkedGitlabProjectId?: number;
  selectedBranch?: string;
  linkedWorkspace?: { provider: "google" | "onedrive"; folderId: string };
}
