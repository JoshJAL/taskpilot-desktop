// ── Supported AI Providers ──────────────────────────────────────────────────

export type AiProviderId = "claude" | "openai" | "groq";

export const PROVIDER_SHORT_LABELS: Record<AiProviderId, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  groq: "Groq",
};

// ── Integration Status ─────────────────────────────────────────────────────

export interface IntegrationStatus {
  trelloLinked: boolean;
  githubLinked: boolean;
  gitlabLinked: boolean;
  googleDriveLinked: boolean;
  oneDriveLinked: boolean;
  hasApiKey: boolean;
  configuredProviders: AiProviderId[];
}

// ── Trello Types ───────────────────────────────────────────────────────────

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

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
}

export interface BoardData {
  board: { id: string; name: string };
  cards: TrelloCard[];
  doneListId?: string;
}

// ── GitHub / GitLab Types ──────────────────────────────────────────────────

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

// ── Session Types ──────────────────────────────────────────────────────────

export interface SessionStartConfig {
  boardData: BoardData;
  cwd?: string;
  userMessage?: string;
  providerId?: AiProviderId;
  modelId?: string;
  source?: "trello" | "github" | "gitlab";
  mode?: "sequential" | "parallel";
  maxConcurrency?: number;
  webMode?: boolean;
  githubOwner?: string;
  githubRepo?: string;
  gitlabProjectId?: number;
  selectedBranch?: string;
  workspaceProvider?: "google" | "onedrive";
  workspaceFolderId?: string;
}

export interface SessionEvent {
  type: string;
  content?: string;
  message?: { content?: unknown };
  raw?: { message?: { content?: unknown } };
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
  model?: string;
  subtype?: string;
  result?: string;
  url?: string;
  number?: number;
  title?: string;
  draft?: boolean;
}
