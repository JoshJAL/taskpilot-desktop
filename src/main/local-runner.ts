/**
 * Local session runner — uses the Anthropic Messages API with the generic agent loop
 * and local filesystem tools. Runs entirely in the Electron main process.
 *
 * This is the desktop equivalent of the CLI's runner.ts, but uses the generic agent
 * loop instead of the Claude Agent SDK (which requires the Claude Code binary).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { getMainWindow } from "./index";
import { apiFetch } from "./api";
import type { SessionStartConfig, SessionEvent } from "./types";
import type { AiProviderId } from "./types";

const exec = promisify(execFile);
const MAX_OUTPUT_BYTES = 10 * 1024;
const BASH_TIMEOUT_MS = 120_000;

// ── Prompts ────────────────────────────────────────────────────────────────

const TRELLO_SYSTEM_PROMPT = `You are operating on a codebase. You have been given a Trello board containing tasks.
Work through each card and checklist item in order.
For each checklist item you complete, call the check_trello_item tool with the checkItemId and cardId.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL checklist items on a card, call move_card_to_done with the cardId to move it to the Verify list.
Once a card is in Verify, do not interact with it again — move on to the next card.
Focus on one card at a time. Complete all its items, move it to Verify, then proceed to the next.
IMPORTANT: Only make changes that are directly described in the cards and checklist items. Do NOT add features, refactor code, or make improvements beyond what is explicitly requested. Stay strictly within the scope of the given tasks.`;

const GITHUB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitHub issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call check_github_task with the issueNumber and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_github_issue with the issueNumber.
When you have finished all issues, call create_pull_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.
If an issue has no task list items but has a body description, implement exactly what the body describes — nothing more.
IMPORTANT: Only make changes that are directly described in the issue title, body, and task list. Do NOT add features, refactor code, or make improvements beyond what is explicitly requested in the issues. Stay strictly within the scope of the given issues.`;

const GITLAB_SYSTEM_PROMPT = `You are operating on a codebase. You have been given GitLab issues containing tasks.
Work through each issue and its task list items in order.
For each task item you complete, call check_gitlab_task with the issueIid and taskIndex.
Do not mark items complete unless the code change has actually been made and verified.
After completing ALL task items on an issue, call close_gitlab_issue with the issueIid.
When you have finished all issues, call create_merge_request to submit your changes.
Focus on one issue at a time. Complete all its tasks, close it, then proceed to the next.
If an issue has no task list items but has a description, implement exactly what the description says — nothing more.
IMPORTANT: Only make changes that are directly described in the issue title, description, and task list. Do NOT add features, refactor code, or make improvements beyond what is explicitly requested in the issues. Stay strictly within the scope of the given issues.`;

// ── Tool Definitions ───────────────────────────────────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const CODING_TOOLS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read the contents of a file. Returns the file text with line numbers.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to the project root" },
        offset: { type: "number", description: "Start reading from this line number (1-based)" },
        limit: { type: "number", description: "Maximum number of lines to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file, creating it if it does not exist.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to the project root" },
        content: { type: "string", description: "The full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace an exact string in a file with new text. The old_text must match exactly.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path relative to the project root" },
        old_text: { type: "string", description: "The exact text to find and replace" },
        new_text: { type: "string", description: "The replacement text" },
      },
      required: ["path", "old_text", "new_text"],
    },
  },
  {
    name: "bash",
    description: "Execute a shell command. Returns stdout and stderr.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to run" },
      },
      required: ["command"],
    },
  },
  {
    name: "search_files",
    description: "Search for a regex pattern in files. Returns matching lines with file paths and line numbers.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern to search for" },
        path: { type: "string", description: "Directory or file to search in (default: project root)" },
        glob: { type: "string", description: 'File glob filter (e.g. "*.ts")' },
      },
      required: ["pattern"],
    },
  },
  {
    name: "list_files",
    description: "List files matching a glob pattern in the project directory.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: 'Glob pattern (e.g. "src/**/*.ts")' },
        path: { type: "string", description: "Directory to search in (default: project root)" },
      },
      required: ["pattern"],
    },
  },
];

const TRELLO_TOOLS: ToolDefinition[] = [
  {
    name: "check_trello_item",
    description: "Mark a Trello checklist item as complete once the corresponding code task is done.",
    parameters: {
      type: "object",
      properties: {
        checkItemId: { type: "string", description: "The Trello checklist item ID" },
        cardId: { type: "string", description: "The Trello card ID" },
      },
      required: ["checkItemId", "cardId"],
    },
  },
  {
    name: "move_card_to_done",
    description: "Move a Trello card to the Verify list after all its checklist items are completed.",
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "string", description: "The Trello card ID to move to Verify" },
      },
      required: ["cardId"],
    },
  },
];

const GITHUB_TOOLS: ToolDefinition[] = [
  {
    name: "check_github_task",
    description: "Mark a task list item in a GitHub issue as complete (updates the checkbox in the issue body).",
    parameters: {
      type: "object",
      properties: {
        issueNumber: { type: "number", description: "The GitHub issue number" },
        taskIndex: { type: "number", description: "The 0-based index of the task in the issue body" },
      },
      required: ["issueNumber", "taskIndex"],
    },
  },
  {
    name: "close_github_issue",
    description: "Close a GitHub issue after all tasks are done.",
    parameters: {
      type: "object",
      properties: {
        issueNumber: { type: "number", description: "The GitHub issue number" },
      },
      required: ["issueNumber"],
    },
  },
  {
    name: "comment_on_issue",
    description: "Add a comment to a GitHub issue to report progress.",
    parameters: {
      type: "object",
      properties: {
        issueNumber: { type: "number", description: "The GitHub issue number" },
        body: { type: "string", description: "The comment text" },
      },
      required: ["issueNumber", "body"],
    },
  },
];

const GITLAB_TOOLS: ToolDefinition[] = [
  {
    name: "check_gitlab_task",
    description: "Mark a task list item in a GitLab issue as complete (updates the checkbox in the issue description).",
    parameters: {
      type: "object",
      properties: {
        issueIid: { type: "number", description: "The GitLab issue IID" },
        taskIndex: { type: "number", description: "The 0-based index of the task in the issue description" },
      },
      required: ["issueIid", "taskIndex"],
    },
  },
  {
    name: "close_gitlab_issue",
    description: "Close a GitLab issue after all tasks are done.",
    parameters: {
      type: "object",
      properties: {
        issueIid: { type: "number", description: "The GitLab issue IID" },
      },
      required: ["issueIid"],
    },
  },
  {
    name: "comment_on_issue",
    description: "Add a note to a GitLab issue to report progress.",
    parameters: {
      type: "object",
      properties: {
        issueIid: { type: "number", description: "The GitLab issue IID" },
        body: { type: "string", description: "The note text" },
      },
      required: ["issueIid", "body"],
    },
  },
];

// ── Path Safety ────────────────────────────────────────────────────────────

function safePath(cwd: string, filePath: string): string {
  const resolved = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath);
  const rel = relative(cwd, resolved);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path "${filePath}" is outside the project directory`);
  }
  return resolved;
}

function truncate(text: string, maxBytes: number = MAX_OUTPUT_BYTES): string {
  if (Buffer.byteLength(text) <= maxBytes) return text;
  return Buffer.from(text).subarray(0, maxBytes).toString("utf8") + "\n... (output truncated)";
}

// ── Tool Implementations ───────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  cwd: string,
  trelloApiKey: string,
  trelloToken: string,
  boardId: string,
): Promise<string> {
  switch (name) {
    case "read_file": {
      const absPath = safePath(cwd, input.path as string);
      if (!existsSync(absPath)) return `File not found: ${input.path}`;
      if (statSync(absPath).isDirectory()) return `${input.path} is a directory`;
      const content = readFileSync(absPath, "utf8");
      const lines = content.split("\n");
      const start = Math.max(0, ((input.offset as number) ?? 1) - 1);
      const end = input.limit ? start + (input.limit as number) : lines.length;
      const numbered = lines.slice(start, end).map((l, i) => `${String(start + i + 1).padStart(5)} ${l}`);
      return truncate(numbered.join("\n"));
    }
    case "write_file": {
      const absPath = safePath(cwd, input.path as string);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, input.content as string, "utf8");
      return `File written: ${input.path}`;
    }
    case "edit_file": {
      const absPath = safePath(cwd, input.path as string);
      if (!existsSync(absPath)) return `File not found: ${input.path}`;
      const content = readFileSync(absPath, "utf8");
      const oldText = input.old_text as string;
      if (!content.includes(oldText)) return `old_text not found in ${input.path}. Make sure it matches exactly.`;
      const count = content.split(oldText).length - 1;
      if (count > 1) return `old_text matches ${count} locations in ${input.path}. Provide more context.`;
      writeFileSync(absPath, content.replace(oldText, input.new_text as string), "utf8");
      return `File edited: ${input.path}`;
    }
    case "bash": {
      try {
        const { stdout, stderr } = await exec("bash", ["-c", input.command as string], {
          cwd, timeout: BASH_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES * 2,
        });
        let result = "";
        if (stdout.trim()) result += stdout;
        if (stderr.trim()) result += (result ? "\n" : "") + `STDERR: ${stderr}`;
        return truncate(result || "(no output)");
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message: string };
        let result = "";
        if (e.stdout) result += e.stdout;
        if (e.stderr) result += (result ? "\n" : "") + `STDERR: ${e.stderr}`;
        return truncate(result || `Error: ${e.message}`);
      }
    }
    case "search_files": {
      const target = input.path ? safePath(cwd, input.path as string) : cwd;
      const args = ["--line-number", "--no-heading", "--color=never", input.pattern as string, target];
      if (input.glob) args.push("--glob", input.glob as string);
      try {
        const { stdout } = await exec("rg", args, { cwd, timeout: 30_000, maxBuffer: MAX_OUTPUT_BYTES * 2 });
        return truncate(stdout || "No matches found");
      } catch { return "No matches found"; }
    }
    case "list_files": {
      const target = input.path ? safePath(cwd, input.path as string) : cwd;
      try {
        const { stdout } = await exec("find", [target, "-name", input.pattern as string, "-type", "f"], {
          timeout: 10_000, maxBuffer: MAX_OUTPUT_BYTES,
        });
        return truncate(stdout.trim() || "No files found");
      } catch { return "No files found"; }
    }
    case "check_trello_item": {
      const TRELLO_BASE = "https://api.trello.com/1";
      const res = await fetch(
        `${TRELLO_BASE}/cards/${input.cardId}/checkItem/${input.checkItemId}?key=${trelloApiKey}&token=${trelloToken}`,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: "complete" }) },
      );
      if (!res.ok) return `Error: Trello API ${res.status}`;
      return `Marked checklist item ${input.checkItemId} as complete on card ${input.cardId}`;
    }
    case "move_card_to_done": {
      const TRELLO_BASE = "https://api.trello.com/1";
      // Find Verify list
      const listsRes = await fetch(
        `${TRELLO_BASE}/boards/${boardId}/lists?filter=open&key=${trelloApiKey}&token=${trelloToken}`,
      );
      const lists = (await listsRes.json()) as Array<{ id: string; name: string; pos?: number }>;
      let verifyList = lists.find((l) => l.name.toLowerCase() === "verify");
      if (!verifyList) {
        // If no Verify list exists, create one positioned before Done
        const doneList = lists.find((l) => l.name.toLowerCase() === "done");
        let position: string | number = "bottom";
        if (doneList && doneList.pos != null) {
          // Position Verify list just before Done
          position = doneList.pos - 1;
        }
        const createRes = await fetch(
          `${TRELLO_BASE}/boards/${boardId}/lists?key=${trelloApiKey}&token=${trelloToken}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Verify", pos: position }) },
        );
        if (!createRes.ok) {
          return `Error: Failed to create Verify list - Trello API ${createRes.status}`;
        }
        verifyList = (await createRes.json()) as { id: string; name: string };
      }
      await fetch(
        `${TRELLO_BASE}/cards/${input.cardId}?key=${trelloApiKey}&token=${trelloToken}`,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idList: verifyList.id }) },
      );
      return `Moved card ${input.cardId} to Verify list`;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── GitHub Tool Implementations ──────────────────────────────────────────

async function executeGitHubTool(
  name: string,
  input: Record<string, unknown>,
  githubToken: string,
  githubOwner: string,
  githubRepo: string,
): Promise<string> {
  const GITHUB_API = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  switch (name) {
    case "check_github_task": {
      const issueNumber = input.issueNumber as number;
      const taskIndex = input.taskIndex as number;
      // Get the issue body
      const issueRes = await fetch(`${GITHUB_API}/repos/${githubOwner}/${githubRepo}/issues/${issueNumber}`, { headers });
      if (!issueRes.ok) return `Error: GitHub API ${issueRes.status}`;
      const issue = (await issueRes.json()) as { body: string | null };
      if (!issue.body) return `Error: Issue #${issueNumber} has no body`;
      // Toggle the checkbox
      const updatedBody = toggleTaskCheckbox(issue.body, taskIndex, true);
      if (updatedBody === issue.body) return `Error: Could not find task at index ${taskIndex}`;
      // Update the issue body
      const updateRes = await fetch(`${GITHUB_API}/repos/${githubOwner}/${githubRepo}/issues/${issueNumber}`, {
        method: "PATCH", headers, body: JSON.stringify({ body: updatedBody }),
      });
      if (!updateRes.ok) return `Error: GitHub API ${updateRes.status}`;
      return `Marked task ${taskIndex} as complete on issue #${issueNumber}`;
    }
    case "close_github_issue": {
      const issueNumber = input.issueNumber as number;
      const res = await fetch(`${GITHUB_API}/repos/${githubOwner}/${githubRepo}/issues/${issueNumber}`, {
        method: "PATCH", headers, body: JSON.stringify({ state: "closed" }),
      });
      if (!res.ok) return `Error: GitHub API ${res.status}`;
      return `Closed issue #${issueNumber}`;
    }
    case "comment_on_issue": {
      const issueNumber = input.issueNumber as number;
      const res = await fetch(`${GITHUB_API}/repos/${githubOwner}/${githubRepo}/issues/${issueNumber}/comments`, {
        method: "POST", headers, body: JSON.stringify({ body: input.body as string }),
      });
      if (!res.ok) return `Error: GitHub API ${res.status}`;
      return `Comment added to issue #${issueNumber}`;
    }
    default:
      return `Unknown GitHub tool: ${name}`;
  }
}

// ── GitLab Tool Implementations ──────────────────────────────────────────

async function executeGitLabTool(
  name: string,
  input: Record<string, unknown>,
  gitlabToken: string,
  gitlabProjectId: number,
): Promise<string> {
  const GITLAB_API = "https://gitlab.com/api/v4";
  const headers = {
    "PRIVATE-TOKEN": gitlabToken,
    "Content-Type": "application/json",
  };

  switch (name) {
    case "check_gitlab_task": {
      const issueIid = input.issueIid as number;
      const taskIndex = input.taskIndex as number;
      const issueRes = await fetch(`${GITLAB_API}/projects/${gitlabProjectId}/issues/${issueIid}`, { headers });
      if (!issueRes.ok) return `Error: GitLab API ${issueRes.status}`;
      const issue = (await issueRes.json()) as { description: string | null };
      if (!issue.description) return `Error: Issue #${issueIid} has no description`;
      const updatedDesc = toggleTaskCheckbox(issue.description, taskIndex, true);
      if (updatedDesc === issue.description) return `Error: Could not find task at index ${taskIndex}`;
      const updateRes = await fetch(`${GITLAB_API}/projects/${gitlabProjectId}/issues/${issueIid}`, {
        method: "PUT", headers, body: JSON.stringify({ description: updatedDesc }),
      });
      if (!updateRes.ok) return `Error: GitLab API ${updateRes.status}`;
      return `Marked task ${taskIndex} as complete on issue #${issueIid}`;
    }
    case "close_gitlab_issue": {
      const issueIid = input.issueIid as number;
      const res = await fetch(`${GITLAB_API}/projects/${gitlabProjectId}/issues/${issueIid}`, {
        method: "PUT", headers, body: JSON.stringify({ state_event: "close" }),
      });
      if (!res.ok) return `Error: GitLab API ${res.status}`;
      return `Closed issue #${issueIid}`;
    }
    case "comment_on_issue": {
      const issueIid = input.issueIid as number;
      const res = await fetch(`${GITLAB_API}/projects/${gitlabProjectId}/issues/${issueIid}/notes`, {
        method: "POST", headers, body: JSON.stringify({ body: input.body as string }),
      });
      if (!res.ok) return `Error: GitLab API ${res.status}`;
      return `Note added to issue #${issueIid}`;
    }
    default:
      return `Unknown GitLab tool: ${name}`;
  }
}

/** Toggle a markdown task list checkbox at the given index. */
function toggleTaskCheckbox(body: string, taskIndex: number, checked: boolean): string {
  const taskPattern = /^(\s*)-\s+\[([ xX])\]\s+(.*)/;
  const lines = body.split("\n");
  let currentIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (taskPattern.test(lines[i])) {
      if (currentIndex === taskIndex) {
        lines[i] = lines[i].replace(taskPattern, (_m, indent, _box, text) =>
          `${indent}- [${checked ? "x" : " "}] ${text}`);
        return lines.join("\n");
      }
      currentIndex++;
    }
  }
  return body; // Not found — return unchanged
}

// ── Chat Completion Types ──────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

type ChatCompletionFn = (
  messages: ChatMessage[],
  tools: ToolDefinition[],
  signal?: AbortSignal,
) => Promise<{ content: string | null; tool_calls: ToolCall[] }>;

// ── Provider Chat Functions ───────────────────────────────────────────────

function createAnthropicChatFn(apiKey: string, modelId?: string): ChatCompletionFn {
  const client = new Anthropic({ apiKey });
  return async (messages, tools, signal) => {
    const systemMessages = messages.filter((m) => m.role === "system");
    const systemPrompt = systemMessages.map((m) => m.content ?? "").filter(Boolean).join("\n\n");

    const anthropicMessages: Anthropic.MessageParam[] = [];
    for (const msg of messages) {
      if (msg.role === "system") continue;
      if (msg.role === "user") {
        anthropicMessages.push({ role: "user", content: msg.content ?? "" });
      } else if (msg.role === "assistant") {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) content.push({ type: "text", text: msg.content });
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            let parsedInput: Record<string, unknown> = {};
            try { parsedInput = JSON.parse(tc.function.arguments); } catch { /* */ }
            content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input: parsedInput });
          }
        }
        if (content.length > 0) anthropicMessages.push({ role: "assistant", content });
      } else if (msg.role === "tool") {
        anthropicMessages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: msg.tool_call_id ?? "", content: msg.content ?? "" }],
        });
      }
    }

    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    const response = await client.messages.create(
      { model: modelId ?? "claude-sonnet-4-6-20250827", max_tokens: 8192, system: systemPrompt || undefined, messages: anthropicMessages, tools: anthropicTools.length > 0 ? anthropicTools : undefined },
      { signal },
    );

    let textContent: string | null = null;
    const toolCalls: ToolCall[] = [];
    for (const block of response.content) {
      if (block.type === "text") textContent = (textContent ?? "") + block.text;
      else if (block.type === "tool_use") {
        toolCalls.push({ id: block.id, type: "function", function: { name: block.name, arguments: JSON.stringify(block.input) } });
      }
    }
    return { content: textContent, tool_calls: toolCalls };
  };
}

function createOpenAIChatFn(apiKey: string, modelId?: string): ChatCompletionFn {
  const client = new OpenAI({ apiKey });
  return async (messages, tools, signal) => {
    const response = await client.chat.completions.create(
      {
        model: modelId ?? "gpt-5.4-2026-03-05",
        messages: messages.map((m) => {
          if (m.role === "tool") return { role: "tool" as const, content: m.content ?? "", tool_call_id: m.tool_call_id ?? "" };
          if (m.role === "assistant" && m.tool_calls) {
            return {
              role: "assistant" as const,
              content: m.content,
              tool_calls: m.tool_calls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.function.name, arguments: tc.function.arguments } })),
            };
          }
          return { role: m.role as "system" | "user" | "assistant", content: m.content ?? "" };
        }),
        tools: tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.parameters as Record<string, unknown> } })),
        temperature: 0,
      },
      { signal },
    );
    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? null,
      tool_calls: (choice?.message?.tool_calls ?? [])
        .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: "function" } => tc.type === "function")
        .map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.function.name, arguments: tc.function.arguments } })),
    };
  };
}

function createGroqChatFn(apiKey: string, modelId?: string): ChatCompletionFn {
  const client = new Groq({ apiKey });
  return async (messages, tools, signal) => {
    const response = await client.chat.completions.create(
      {
        model: modelId ?? "llama-3.3-70b-versatile",
        messages: messages.map((m) => {
          if (m.role === "tool") return { role: "tool" as const, content: m.content ?? "", tool_call_id: m.tool_call_id ?? "" };
          if (m.role === "assistant" && m.tool_calls) {
            return {
              role: "assistant" as const,
              content: m.content,
              tool_calls: m.tool_calls.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.function.name, arguments: tc.function.arguments } })),
            };
          }
          return { role: m.role as "system" | "user" | "assistant", content: m.content ?? "" };
        }),
        tools: tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.parameters as Record<string, unknown> } })),
        temperature: 0,
      },
      { signal },
    );
    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? null,
      tool_calls: (choice?.message?.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    };
  };
}

function getChatCompletionFn(providerId: AiProviderId, apiKey: string, modelId?: string): { fn: ChatCompletionFn; modelLabel: string } {
  switch (providerId) {
    case "openai":
      return { fn: createOpenAIChatFn(apiKey, modelId), modelLabel: modelId ?? "gpt-5.4-2026-03-05" };
    case "groq":
      return { fn: createGroqChatFn(apiKey, modelId), modelLabel: modelId ?? "llama-3.3-70b-versatile" };
    case "claude":
    default:
      return { fn: createAnthropicChatFn(apiKey, modelId), modelLabel: modelId ?? "claude-sonnet-4" };
  }
}

// ── Main Entry Point ───────────────────────────────────────────────────────

interface Credentials {
  anthropicApiKey: string;
  trelloApiKey: string;
  trelloToken: string;
  providerId: string;
  githubToken?: string;
  gitlabToken?: string;
}

export async function runLocalSession(
  config: SessionStartConfig,
  credentials: Credentials,
): Promise<void> {
  const mainWindow = getMainWindow();

  // Collect events for session history recording
  const recordedEvents: Array<{ type: string; content: Record<string, unknown>; sequence: number; timestamp: string }> = [];
  let eventSeq = 0;

  function emit(event: SessionEvent) {
    mainWindow?.webContents.send("session:event", event);
    // Record for history
    recordedEvents.push({
      type: event.type,
      content: event as unknown as Record<string, unknown>,
      sequence: eventSeq++,
      timestamp: new Date().toISOString(),
    });
  }

  const cwd = config.cwd!;
  const boardData = config.boardData;
  const startedAt = new Date();
  let status: "completed" | "failed" = "completed";
  let errorMessage: string | undefined;
  let tasksCompleted = 0;

  const source = config.source ?? "trello";

  const activeBoardData = {
    ...boardData,
    cards: boardData.doneListId
      ? boardData.cards.filter((c) => c.idList !== boardData.doneListId)
      : boardData.cards,
  };

  const tasksTotal = activeBoardData.cards.reduce(
    (sum, c) => sum + c.checklists.reduce((s, cl) => s + cl.checkItems.length, 0),
    0,
  );

  // Select system prompt, user prompt, and tools based on source
  let systemPrompt: string;
  let userPrompt: string;
  let sourceTools: ToolDefinition[];

  if (source === "github") {
    systemPrompt = GITHUB_SYSTEM_PROMPT;
    sourceTools = GITHUB_TOOLS;
    // Build GitHub-style user prompt with issue format
    const issues = activeBoardData.cards.map((card) => {
      const tasks = (card.checklists ?? []).flatMap((cl) =>
        cl.checkItems
          .filter((item) => item.state !== "complete")
          .map((item) => ({
            index: Number(item.id.replace("task-", "")),
            text: item.name,
          })),
      );
      return { number: Number(card.id), title: card.name, body: card.desc, tasks };
    });
    const data = { repo: `${config.githubOwner}/${config.githubRepo}`, issues };
    userPrompt = `Here are the GitHub issues with tasks to complete:\n\n${JSON.stringify(data, null, 2)}`;
    if (issues.some((i) => i.tasks.length > 0)) {
      userPrompt += `\n\nEach task has an "index" field — use this as the taskIndex when calling check_github_task.`;
    }
  } else if (source === "gitlab") {
    systemPrompt = GITLAB_SYSTEM_PROMPT;
    sourceTools = GITLAB_TOOLS;
    const issues = activeBoardData.cards.map((card) => {
      const tasks = (card.checklists ?? []).flatMap((cl) =>
        cl.checkItems
          .filter((item) => item.state !== "complete")
          .map((item) => ({
            index: Number(item.id.replace("task-", "")),
            text: item.name,
          })),
      );
      return { iid: Number(card.id), title: card.name, description: card.desc, tasks };
    });
    const data = { project: boardData.board.name, issues };
    userPrompt = `Here are the GitLab issues with tasks to complete:\n\n${JSON.stringify(data, null, 2)}`;
    if (issues.some((i) => i.tasks.length > 0)) {
      userPrompt += `\n\nEach task has an "index" field — use this as the taskIndex when calling check_gitlab_task.`;
    }
  } else {
    systemPrompt = TRELLO_SYSTEM_PROMPT;
    sourceTools = TRELLO_TOOLS;
    userPrompt = `Here is the Trello board with tasks to complete:\n\n${JSON.stringify(activeBoardData, null, 2)}`;
  }

  if (config.userMessage?.trim()) {
    userPrompt += `\n\nAdditional instructions from the user:\n${config.userMessage.trim()}`;
  }

  const allTools = [...CODING_TOOLS, ...sourceTools];
  const providerId = (config.providerId ?? credentials.providerId ?? "claude") as AiProviderId;
  const { fn: chatCompletion, modelLabel } = getChatCompletionFn(providerId, credentials.anthropicApiKey, config.modelId);

  emit({ type: "system", subtype: "init", model: modelLabel });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    for (let turn = 0; turn < 50; turn++) {
      let response: Awaited<ReturnType<typeof chatCompletion>>;
      try {
        response = await chatCompletion(messages, allTools);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat completion failed";
        emit({ type: "error", error: msg });
        status = "failed";
        errorMessage = msg;
        break;
      }

      if (response.content) {
        emit({ type: "assistant", content: response.content });
      }

      if (!response.tool_calls || response.tool_calls.length === 0) {
        if (turn === 0) {
          messages.push({ role: "assistant", content: response.content });
          messages.push({ role: "user", content: "Please use the available tools to complete the tasks. Start by using list_files or search_files to explore the codebase, then make the necessary code changes." });
          continue;
        }
        messages.push({ role: "assistant", content: response.content });
        break;
      }

      messages.push({ role: "assistant", content: response.content, tool_calls: response.tool_calls });

      for (const toolCall of response.tool_calls) {
        let input: Record<string, unknown>;
        try { input = JSON.parse(toolCall.function.arguments); } catch { input = {}; }

        emit({ type: "tool_use", toolName: toolCall.function.name, toolInput: input });

        let result: string;
        const toolName = toolCall.function.name;

        if (source === "github" && (toolName === "check_github_task" || toolName === "close_github_issue" || toolName === "comment_on_issue")) {
          result = await executeGitHubTool(toolName, input, credentials.githubToken ?? "", config.githubOwner ?? "", config.githubRepo ?? "");
        } else if (source === "gitlab" && (toolName === "check_gitlab_task" || toolName === "close_gitlab_issue" || toolName === "comment_on_issue")) {
          result = await executeGitLabTool(toolName, input, credentials.gitlabToken ?? "", config.gitlabProjectId ?? 0);
        } else {
          result = await executeTool(toolName, input, cwd, credentials.trelloApiKey, credentials.trelloToken, boardData.board.id);
        }

        // Track completed tasks
        if ((toolName === "check_trello_item" || toolName === "check_github_task" || toolName === "check_gitlab_task") && !result.startsWith("Error")) {
          tasksCompleted++;
        }

        emit({ type: "tool_result", toolName: toolCall.function.name, toolResult: result });

        messages.push({ role: "tool", content: result, tool_call_id: toolCall.id });
      }
    }
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Session failed";
    emit({ type: "error", error: errorMessage });
  }

  emit({ type: "done" });

  // Record session to server for history
  const completedAt = new Date();
  try {
    await apiFetch("/api/sessions/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: config.source ?? "trello",
        sourceIdentifier: boardData.board.id,
        sourceName: boardData.board.name,
        providerId,
        mode: config.mode ?? "sequential",
        maxConcurrency: config.maxConcurrency ?? null,
        initialMessage: config.userMessage ?? null,
        status,
        errorMessage: errorMessage ?? null,
        inputTokens: 0,
        outputTokens: 0,
        totalCostCents: 0,
        tasksTotal,
        tasksCompleted,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        events: recordedEvents,
      }),
    });
  } catch {
    // Best effort — don't fail the session if history recording fails
  }
}
