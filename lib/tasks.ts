// Task model shared by the server store, the API routes and the UI.
// Plan tasks are derived from lib/plan.ts with stable ids; only their
// assignment state is stored. Custom tasks are stored in full.

import { decisions, initiatives, phases, type Pillar } from "@/lib/plan";

export const STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const KINDS = ["decision", "activity", "initiative", "custom"] as const;

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
  initiative: "Initiative",
  custom: "Custom",
};

export const KIND_PLURAL: Record<Kind, string> = {
  decision: "Decisions",
  activity: "Activities",
  initiative: "Initiatives",
  custom: "Custom",
};

export type Member = { id: string; name: string; role: string; email: string };

/** Mutable assignment state for any task. Dates are YYYY-MM-DD. */
export type TaskState = {
  assigneeId: string | null;
  status: Status;
  priority: Priority;
  due: string | null;
  notes: string;
  updatedAt: string | null;
};

export type CustomTask = {
  id: string;
  title: string;
  detail: string;
  pillar: Pillar | null;
  createdAt: string;
};

/** Stored per task. Plan tasks may also carry edited wording (title/detail). */
export type StoredState = Partial<TaskState> & { title?: string; detail?: string };

/** What the store persists and the API returns. */
export type BoardData = {
  members: Member[];
  tasks: Record<string, StoredState>;
  custom: CustomTask[];
  /** Ids of tasks taken off the board. They can be restored. */
  removed: string[];
};

/** A task as the UI shows it: catalogue info merged with its state. */
export type Task = TaskState & {
  id: string;
  kind: Kind;
  title: string;
  detail: string;
  context: string;
  pillar: Pillar | null;
  /** Plan wording, so edited plan tasks can be reset. Equals title/detail when unedited. */
  planTitle: string;
  planDetail: string;
  /** A plan task whose title or detail was changed on the board. */
  edited: boolean;
};

const ROMAN = ["I", "II", "III"];
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type CatalogueItem = Omit<Task, keyof TaskState | "planTitle" | "planDetail" | "edited">;

/** Every task that comes from the plan itself, in display order. */
export function planCatalogue(): CatalogueItem[] {
  const byId = new Map(initiatives.map((i) => [i.id, i]));
  return [
    ...decisions.map((d) => ({
      id: decisionTaskId(d.topic),
      kind: "decision" as const,
      title: d.topic,
      detail: d.question,
      context: "Decision before launch",
      pillar: null,
    })),
    ...phases.flatMap((p) =>
      p.activities.map((a) => {
        const ini = byId.get(a.initiativeId)!;
        return {
          id: activityTaskId(p.phase, a.initiativeId),
          kind: "activity" as const,
          title: a.activity,
          detail: ini.name,
          context: `Act ${ROMAN[p.phase - 1]} · ${p.period}`,
          pillar: ini.pillar,
        };
      }),
    ),
    ...initiatives.map((i) => ({
      id: initiativeTaskId(i.id),
      kind: "initiative" as const,
      title: i.name,
      detail: i.measure,
      context: `Initiative ${String(i.id).padStart(2, "0")} · ${i.pillar}`,
      pillar: i.pillar,
    })),
  ];
}

export const decisionTaskId = (topic: string) => `decision:${slug(topic)}`;
export const activityTaskId = (phase: number, initiativeId: number) => `activity:p${phase}-i${initiativeId}`;
export const initiativeTaskId = (id: number) => `initiative:${id}`;

export function defaultState(kind: Kind): TaskState {
  return {
    assigneeId: null,
    status: "todo",
    priority: kind === "decision" ? "high" : "medium",
    due: null,
    notes: "",
    updatedAt: null,
  };
}

/** Merges the catalogue, custom tasks and stored state into display tasks (including removed ones). */
export function buildAllTasks(data: BoardData): Task[] {
  const base: CatalogueItem[] = [
    ...planCatalogue(),
    ...data.custom.map((c) => ({
      id: c.id,
      kind: "custom" as const,
      title: c.title,
      detail: c.detail,
      context: c.pillar ? `Custom · ${c.pillar}` : "Custom task",
      pillar: c.pillar,
    })),
  ];
  const memberIds = new Set(data.members.map((m) => m.id));
  return base.map((t) => {
    const { title, detail, ...stored } = data.tasks[t.id] ?? {};
    const s = { ...defaultState(t.kind), ...stored };
    if (s.assigneeId && !memberIds.has(s.assigneeId)) s.assigneeId = null;
    const plan = t.kind !== "custom";
    return {
      ...t,
      ...s,
      title: plan && title ? title : t.title,
      detail: plan && detail ? detail : t.detail,
      planTitle: t.title,
      planDetail: t.detail,
      edited: plan && !!(title || detail),
    };
  });
}

/** Tasks on the board, i.e. not removed. */
export function buildTasks(data: BoardData): Task[] {
  const removed = new Set(data.removed);
  return buildAllTasks(data).filter((t) => !removed.has(t.id));
}

export const isPlanTaskId = (id: string) => planCatalogue().some((t) => t.id === id);

/** Today as YYYY-MM-DD in the viewer's local time. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isOverdue = (t: Pick<Task, "due" | "status">, today = todayISO()) =>
  !!t.due && t.status !== "done" && t.due < today;

export const LIMITS = { name: 60, role: 60, email: 120, title: 160, detail: 500, notes: 2000 };
