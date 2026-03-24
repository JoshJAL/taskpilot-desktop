// Re-export types used by renderer components.
// These mirror the main process types but are used in the renderer context.

export type AiProviderId = "claude" | "openai" | "groq";

export const PROVIDER_SHORT_LABELS: Record<AiProviderId, string> = {
  claude: "Claude",
  openai: "ChatGPT",
  groq: "Groq",
};

/** Preferred provider display order (alphabetical by label). */
export const PROVIDER_ORDER: AiProviderId[] = ["claude", "openai", "groq"];

export const PROVIDER_MODELS: Record<AiProviderId, Array<{ id: string; label: string }>> = {
  claude: [
    { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
    { id: "claude-opus-4-6-20250827", label: "Opus 4.6" },
    { id: "claude-sonnet-4-6-20250827", label: "Sonnet 4.6" },
  ],
  openai: [
    { id: "gpt-5.4-2026-03-05", label: "GPT-5.4" },
    { id: "gpt-5.4-mini-2026-03-17", label: "GPT-5.4 Mini" },
    { id: "gpt-5.4-nano-2026-03-17", label: "GPT-5.4 Nano" },
  ],
  groq: [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { id: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout" },
    { id: "qwen/qwen-3-32b", label: "Qwen 3 32B" },
  ],
};

export const DEFAULT_MODEL: Record<AiProviderId, string> = {
  claude: "claude-sonnet-4-6-20250827",
  openai: "gpt-5.4-2026-03-05",
  groq: "llama-3.3-70b-versatile",
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
