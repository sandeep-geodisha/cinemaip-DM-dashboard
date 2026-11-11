// Task board model, shared by the server store, the API routes and the UI.
//
// Everything lives in one readable JSON file (data/tasks.json by default):
// the team, every task in full (title, summary, description, owner, status,
// priority, due date, notes) and a log of who changed what. Plan tasks are
// seeded from lib/plan.ts the first time they're needed; after that the file
// is the source of truth and can be edited through the page or by hand.

import {
  budgetSummary,
  criticEconomics,
  decisions,
  initiatives,
  payouts,
  phases,
  sharePct,
  type Initiative,
  type Phase,
  type Pillar,
  type PlanActivity,
} from "@/lib/plan";

export const STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const KINDS = ["decision", "activity", "custom"] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Kind = (typeof KINDS)[number];

export const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};
export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
export const KIND_LABEL: Record<Kind, string> = {
  decision: "Decision",
  activity: "Activity",
  custom: "Custom",
};
export const KIND_PLURAL: Record<Kind, string> = {
  decision: "Decisions",
  activity: "Activities",
  custom: "Custom",
};

export type Member = {
  id: string;
  name: string;
  role: string;
  email: string;
  addedAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  type: Kind;
  title: string;
  /** One line shown on cards. */
  summary: string;
  /** Full brief. Lines like "Label: text" and "- item" are formatted on the page. */
  description: string;
  /** Where the task sits in the plan, e.g. "Act I · Months 1–2". */
  context: string;
  pillar: Pillar | null;
  /** Everyone who owns this task (team member ids), in the order they were added. Empty = unassigned. */
  assigneeIds: string[];
  /** Their names, in the same order, kept in step with the team list so the file is readable. */
  assignees: string[];
  status: Status;
  priority: Priority;
  /** YYYY-MM-DD */
  due: string | null;
  notes: string;
  /** Taken off the board; can be restored. */
  removed: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
};

export type ActivityEntry = {
  id: string;
  at: string;
  /** Name of the person who made the change, or "Someone". */
  by: string;
  taskId: string | null;
  /** What was changed: a task title or a person's name. */
  subject: string;
  action: string;
};

/** The JSON file, exactly as stored. */
export type BoardFile = {
  /** 3: tasks can have several owners (assigneeIds). 2: one owner (assigneeId). */
  version: 3;
  /** Increases on every save. */
  rev: number;
  updatedAt: string;
  team: Member[];
  tasks: Task[];
  /** Newest first. */
  activity: ActivityEntry[];
};

/** What GET /api/tasks returns. */
export type BoardResponse = BoardFile & {
  /** Changes whenever the file changes, including hand edits. */
  etag: string;
  /** Where the board is stored. */
  storage: "file" | "redis" | "none";
  /** How often the page should check for changes. */
  pollMs: number;
  /** Set when the board can't be read or saved; the page shows the last good copy and edits pause. */
  fileError?: string;
};

/** True for a board in the current format (guards against stale pages and odd responses). */
export function isBoardResponse(v: unknown): v is BoardResponse {
  const b = v as BoardResponse | null;
  return !!b && b.version === 3 && Array.isArray(b.team) && Array.isArray(b.tasks) && Array.isArray(b.activity);
}

export const LIMITS = { owners: 25, name: 60, role: 60, email: 120, title: 160, summary: 300, description: 6000, notes: 4000 };
export const ACTIVITY_CAP = 500;

/* ------------------------------------------------------------------ */
/* Plan catalogue: the default wording of every plan task.             */
/* ------------------------------------------------------------------ */

const ROMAN = ["I", "II", "III"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const decisionTaskId = (topic: string) => `decision:${slug(topic)}`;
export const activityTaskId = (phase: number, initiativeId: number) => `activity:p${phase}-i${initiativeId}`;
/** Retired: initiatives are no longer tasks of their own; their calendar activities are. */
export const retiredInitiativeId = (id: string) => /^initiative:\d+$/.test(id);

export type PlanText = Pick<Task, "id" | "type" | "title" | "summary" | "description" | "context" | "pillar">;

const money = (k: number) => (k === 0 ? "₹0 (deferred)" : `₹${k}K`);
const payLabel = (i: Initiative) => (i.payment === "Pay on result" ? "paid only on result" : "spent upfront");

/** Calendar tasks of one initiative, in plan order. */
export function activitiesOf(initiativeId: number) {
  return phases.flatMap((p) => p.activities.filter((a) => a.initiativeId === initiativeId).map((a) => ({ phase: p, a })));
}

function budgetLine(i: Initiative, a: PlanActivity) {
  if (a.budget) return a.budget;
  const others = activitiesOf(i.id).filter((x) => x.a !== a);
  if (i.budgetK === 0) return "₹0 in these six months.";
  if (!others.length) return `${money(i.budgetK)}, the whole ${i.name} line (${sharePct(i.budgetK)}% of cash), ${payLabel(i)}.`;
  return `Shares the ${money(i.budgetK)} ${i.name} line with “${others.map((o) => o.a.activity).join("”, “")}”, ${payLabel(i)}.`;
}

/** Calendar tasks that wait on a decision. */
function heldUpBy(topic: string) {
  return phases.flatMap((p) =>
    p.activities.filter((a) => a.needs?.includes(topic)).map((a) => `- Act ${ROMAN[p.phase - 1]}: ${a.activity}`),
  );
}

function activityDescription(p: Phase, a: PlanActivity, i: Initiative) {
  return [
    "Steps:",
    ...a.steps.map((x) => `- ${x}`),
    `Done when: ${a.doneWhen}`,
    `Measure: ${a.measure}`,
    `Budget: ${budgetLine(i, a)}`,
    `Watch out for: ${a.watch}`,
    ...(a.needs?.length ? [`Decide first: ${a.needs.join(", ")} (see Decisions)`] : []),
    `Part of: Initiative ${pad2(i.id)} · ${i.name} (${i.pillar}), Act ${ROMAN[p.phase - 1]} · ${p.period}`,
  ].join("\n");
}

function decisionDescription(topic: string, question: string): string {
  const b = budgetSummary();
  const c = criticEconomics();
  const pay = (item: string) => payouts.find((p) => p.item === item)?.value ?? 0;
  const ini = (id: number) => initiatives.find((i) => i.id === id)!;
  const facts: Record<string, string[]> = {
    "Cash cap": [
      `Context: The plan spends ₹${(b.totalK / 100).toFixed(2)}L in cash over six months, with no contingency line. ${b.onResultPct}% (₹${b.onResultK}K) is paid only when results arrive; ₹${b.upfrontK}K is spent upfront.`,
      `Easiest lines to trim: ${ini(8).name} (${money(ini(8).budgetK)}) and ${ini(12).name} (${money(ini(12).budgetK)}).`,
      "Decision needed: Confirm the cash ceiling, or name the lines to cut and by how much.",
    ],
    "Team time": [
      "Context: Cash is small; team time is the plan's real cost.",
      "Workstreams that need an owner:",
      `- ${ini(1).name}: movie pages, schema markup and answer blocks`,
      `- ${ini(2).name}: own-page bots and the approval queue`,
      `- ${ini(3).name}: channel database and partnership outreach`,
      "Decision needed: One named owner per workstream before Act I starts.",
    ],
    "Prize partners": [
      `Context: ${ini(8).name} rely on tickets and coupons from partners with a small cash prize, across three contests. ${ini(12).name} offers ₹10,000 and ₹5,000 prizes that a sponsor should cover.`,
      "Decision needed: A theatre or ticketing partner for prediction prizes, and a sponsor for the short film prizes.",
    ],
    GEO: [
      "Context: GEO can mean being cited by AI assistants, or location-based search. The current plan assumes the first (answer blocks and AI citation checks).",
      "If it means location-based search, the plan shifts to city pages.",
      `Decision needed: Which meaning the ${ini(1).name} line targets.`,
    ],
    Points: [
      `Context: Critic payouts assume 1 point = ₹1. A review earns ${pay("New movie review")} points, a referral ${pay("Referral")}. Critics get a ₹${pay("Joining bonus")} joining bonus and can cash out at ₹${pay("Cash-out threshold").toLocaleString("en-IN")}.`,
      `Effect: Each critic costs at most ₹${c.maxCost.toLocaleString("en-IN")}, so ${c.critics} critics cap payouts at ₹${c.payoutCapK}K.`,
      "Decision needed: Confirm the 1 point = ₹1 rate.",
    ],
    Bots: [
      `Context: ${ini(2).name} use official APIs, one low-cost automation tool and an approval queue with rate caps. Fully automatic link comments break Meta and X rules.`,
      "Decision needed: Whether an approval queue on other pages' comments is acceptable under each platform's rules, or limit bots to our own pages.",
    ],
    "Legal check": [
      `Context: ${ini(8).name} and the ${ini(12).name.toLowerCase()} offer cash prizes. Both need free entry and clear rules.`,
      "Decision needed: Who carries out the legal review, and by when, so the Act II contests aren't delayed.",
    ],
  };
  const held = heldUpBy(topic);
  return [`Question: ${question}`, ...(facts[topic] ?? []), ...(held.length ? ["Holds up:", ...held] : [])].join("\n");
}

/**
 * Default text for every plan task, in display order: the decisions to make
 * before launch, then one task per calendar activity. Initiatives are the
 * plan's budget lines; their work is these activities, so they aren't tasks
 * of their own (that would repeat the same content twice).
 */
export function planCatalogue(): PlanText[] {
  const byId = new Map(initiatives.map((i) => [i.id, i]));
  return [
    ...decisions.map((d) => ({
      id: decisionTaskId(d.topic),
      type: "decision" as const,
      title: d.title,
      summary: d.question,
      description: decisionDescription(d.topic, d.question),
      context: `Before launch · ${d.topic}`,
      pillar: null,
    })),
    ...phases.flatMap((p) =>
      p.activities.map((a) => {
        const ini = byId.get(a.initiativeId)!;
        return {
          id: activityTaskId(p.phase, a.initiativeId),
          type: "activity" as const,
          title: a.activity,
          summary: a.summary,
          description: activityDescription(p, a, ini),
          context: `Act ${ROMAN[p.phase - 1]} · ${p.period} · ${ini.name}`,
          pillar: ini.pillar,
        };
      }),
    ),
  ];
}

let catalogueCache: Map<string, PlanText> | null = null;
export function planTextById(): Map<string, PlanText> {
  if (!catalogueCache) catalogueCache = new Map(planCatalogue().map((t) => [t.id, t]));
  return catalogueCache;
}
export const isPlanTaskId = (id: string) => planTextById().has(id);

export function seedTask(p: PlanText, now: string): Task {
  return {
    ...p,
    assigneeIds: [],
    assignees: [],
    status: "todo",
    priority: p.type === "decision" ? "high" : "medium",
    due: null,
    notes: "",
    removed: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
  };
}

/** A plan task whose wording differs from the plan. */
export function isEdited(t: Task) {
  const p = planTextById().get(t.id);
  return !!p && (p.title !== t.title || p.summary !== t.summary || p.description !== t.description);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Today as YYYY-MM-DD in the viewer's local time. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isOverdue = (t: Pick<Task, "due" | "status">, today = todayISO()) =>
  !!t.due && t.status !== "done" && t.due < today;

/** True when `memberId` is one of the task's owners. */
export const isOwner = (t: Pick<Task, "assigneeIds">, memberId: string) => t.assigneeIds.includes(memberId);

/** "Asha", "Asha and Ravi", "Asha, Ravi and Meera". */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function formatDate(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
