import { CheckCircle, Clock, Circle } from "lucide-react";

type RoadmapStatus = "done" | "in-progress" | "planned";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
}

interface RoadmapCategory {
  name: string;
  items: RoadmapItem[];
}

const ROADMAP: RoadmapCategory[] = [
  {
    name: "Legal & Compliance",
    items: [
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        description:
          "A clear privacy policy explaining what data we collect, how it's stored, and how it's used.",
        status: "done",
      },
      {
        id: "terms-of-service",
        title: "Terms of Service",
        description:
          "User agreement covering acceptable use, liability, and service terms.",
        status: "done",
      },
      {
        id: "cookie-policy",
        title: "Cookie Policy & Consent Banner",
        description:
          "Documentation of cookies used (session auth, preferences) and a GDPR-compliant consent popup.",
        status: "done",
      },
      {
        id: "data-collection-explainer",
        title: "Data Collection Explainer",
        description:
          "User-facing page explaining exactly what we collect, why, and how long it's retained.",
        status: "done",
      },
    ],
  },
  {
    name: "User Experience",
    items: [
      {
        id: "feature-request-form",
        title: "Feature Request Form",
        description:
          "In-app form for users to submit feature ideas and vote on existing requests.",
        status: "done",
      },
      {
        id: "ui-polish",
        title: "UI Polish & Consistency",
        description:
          "Visual refinements, animation improvements, responsive fixes, and design system cleanup across all pages.",
        status: "in-progress",
      },
      {
        id: "bug-fixes",
        title: "Bug Fixes & Stability",
        description:
          "Ongoing fixes for reported issues, edge cases, and error handling improvements.",
        status: "in-progress",
      },
    ],
  },
  {
    name: "Core Features",
    items: [
      {
        id: "multi-provider",
        title: "Multi-AI Provider Support",
        description:
          "Run sessions with Claude, OpenAI (GPT-4o), or Groq (Llama 3.3) — each with their own API key.",
        status: "done",
      },
      {
        id: "parallel-agents",
        title: "Parallel Agents",
        description:
          "Run one agent per card/issue concurrently in isolated git worktrees with configurable concurrency.",
        status: "done",
      },
      {
        id: "github-gitlab",
        title: "GitHub & GitLab Integration",
        description:
          "Use GitHub issues and GitLab issues as task sources alongside Trello boards.",
        status: "done",
      },
      {
        id: "branch-selection",
        title: "Branch Selection",
        description:
          "Select an existing branch before starting a session instead of always auto-generating one.",
        status: "done",
      },
      {
        id: "session-history",
        title: "Session History & Replay",
        description:
          "Browse past sessions, view event logs, filter by source/status, and retry failed sessions.",
        status: "done",
      },
      {
        id: "cost-analytics",
        title: "Cost Tracking & Budget",
        description:
          "Per-session cost breakdown, monthly spending analytics, and configurable budget limits.",
        status: "done",
      },
      {
        id: "pr-automation",
        title: "PR/MR Automation",
        description:
          "Automatically create pull requests or merge requests after sessions complete.",
        status: "done",
      },
      {
        id: "webhooks",
        title: "Real-Time Webhooks",
        description:
          "Webhook-driven updates from Trello, GitHub, and GitLab with polling fallback.",
        status: "done",
      },
      {
        id: "cloud-mode",
        title: "Cloud Mode",
        description:
          "Run sessions entirely via GitHub/GitLab APIs without a local checkout.",
        status: "done",
      },
      {
        id: "desktop-app",
        title: "Desktop Application",
        description:
          "A native desktop app with the same interface as the web app, enabling local development without needing the CLI.",
        status: "in-progress",
      },
      {
        id: "google-drive",
        title: "Google Drive Workspace",
        description:
          "Connect a Google Drive folder as a workspace. Agents can read, write, and edit files — including Google Sheets — directly in your Drive.",
        status: "done",
      },
      {
        id: "onedrive",
        title: "OneDrive Workspace",
        description:
          "Connect a OneDrive folder as a workspace. Agents can read, write, and edit files — including Excel workbooks — directly in your OneDrive.",
        status: "done",
      },
    ],
  },
];

function getRoadmapProgress() {
  let done = 0;
  let inProgress = 0;
  let planned = 0;

  for (const category of ROADMAP) {
    for (const item of category.items) {
      if (item.status === "done") done++;
      else if (item.status === "in-progress") inProgress++;
      else planned++;
    }
  }

  const total = done + inProgress + planned;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return { done, inProgress, planned, total, percent };
}

const STATUS_CONFIG: Record<
  RoadmapStatus,
  { icon: typeof CheckCircle; label: string; color: string; bg: string }
> = {
  done: {
    icon: CheckCircle,
    label: "Done",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  "in-progress": {
    icon: Clock,
    label: "In Progress",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  planned: {
    icon: Circle,
    label: "Planned",
    color: "text-(--shore-line)",
    bg: "bg-(--foam)",
  },
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color} ${config.bg}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export function RoadmapPage() {
  const progress = getRoadmapProgress();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(--sea-ink)">Roadmap</h1>
        <p className="mt-1 text-sm text-(--sea-ink-soft)">
          What we've shipped and what's coming next.
        </p>
      </div>

      {/* Progress bar */}
      <div className="island-shell rounded-2xl p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-(--sea-ink)">
            Overall progress
          </span>
          <span className="text-sm text-(--sea-ink-soft)">
            {progress.done}/{progress.total} complete
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-(--foam)">
          <div
            className="h-full rounded-full bg-(--lagoon) transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-3 flex gap-4 text-xs text-(--sea-ink-soft)">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            {progress.done} done
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {progress.inProgress} in progress
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-(--shore-line)" />
            {progress.planned} planned
          </span>
        </div>
      </div>

      {/* Categories */}
      {ROADMAP.map((category) => (
        <div key={category.name}>
          <h2 className="mb-3 text-lg font-bold text-(--sea-ink)">
            {category.name}
          </h2>
          <div className="space-y-2">
            {category.items.map((item) => (
              <div
                key={item.id}
                className="island-shell flex items-start gap-4 rounded-xl p-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-(--sea-ink)">
                      {item.title}
                    </h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-(--sea-ink-soft)">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
