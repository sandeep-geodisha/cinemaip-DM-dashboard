// Server-only JSON file store for tasks and team members.
// Writes are serialised through one promise chain and land atomically
// (temp file + rename), so concurrent requests can't interleave or corrupt it.
// Set TASKS_FILE to move the file; the default is data/tasks.json.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { PILLARS, type Pillar } from "@/lib/plan";
import {
  LIMITS,
  PRIORITIES,
  STATUSES,
  isPlanTaskId,
  type BoardData,
  type Priority,
  type Status,
  type TaskState,
} from "@/lib/tasks";

const FILE = process.env.TASKS_FILE ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "tasks.json");

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const empty = (): BoardData => ({ members: [], tasks: {}, custom: [], removed: [] });

export async function readBoard(): Promise<BoardData> {
  try {
    const raw = JSON.parse(await readFile(/*turbopackIgnore: true*/ FILE, "utf8"));
    return { members: raw.members ?? [], tasks: raw.tasks ?? {}, custom: raw.custom ?? [], removed: raw.removed ?? [] };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw e;
  }
}

async function writeBoard(data: BoardData) {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(data, null, 2));
  await rename(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ FILE);
}

// One lock per process, shared by every route. Each route can get its own copy
// of this module, so a module-level variable would give each route its own lock.
const g = globalThis as typeof globalThis & { __cinemaipTaskLock?: Promise<unknown> };

/** Runs `fn` against the latest data and saves the result, one write at a time. */
function mutate(fn: (d: BoardData) => void): Promise<BoardData> {
  const run = (g.__cinemaipTaskLock ?? Promise.resolve()).then(async () => {
    const d = await readBoard();
    fn(d);
    await writeBoard(d);
    return d;
  });
  g.__cinemaipTaskLock = run.catch(() => {});
  return run;
}

/* ---------- validation ---------- */

const str = (v: unknown, field: string, max: number, required = false) => {
  if (v === undefined || v === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return "";
  }
  if (typeof v !== "string") throw new HttpError(400, `${field} must be text`);
  const s = v.trim();
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
};

const oneOf = <T extends string>(v: unknown, list: readonly T[], field: string): T => {
  if (!list.includes(v as T)) throw new HttpError(400, `${field} must be one of ${list.join(", ")}`);
  return v as T;
};

const date = (v: unknown): string | null => {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
    throw new HttpError(400, "due must be a YYYY-MM-DD date");
  return v;
};

const pillar = (v: unknown): Pillar | null => (v === null || v === undefined || v === "" ? null : oneOf(v, PILLARS, "pillar"));

/** Picks and validates the TaskState fields present in `body`. */
function statePatch(body: Record<string, unknown>, d: BoardData): Partial<TaskState> {
  const out: Partial<TaskState> = {};
  if ("assigneeId" in body) {
    const a = body.assigneeId;
    if (a !== null && !d.members.some((m) => m.id === a)) throw new HttpError(400, "Unknown assignee");
    out.assigneeId = (a as string | null) ?? null;
  }
  if ("status" in body) out.status = oneOf<Status>(body.status, STATUSES, "status");
  if ("priority" in body) out.priority = oneOf<Priority>(body.priority, PRIORITIES, "priority");
  if ("due" in body) out.due = date(body.due);
  if ("notes" in body) out.notes = str(body.notes, "notes", LIMITS.notes);
  return out;
}

/* ---------- operations ---------- */

export function updateTask(id: string, body: Record<string, unknown>) {
  return mutate((d) => {
    const custom = d.custom.find((c) => c.id === id);
    if (!custom && !isPlanTaskId(id)) throw new HttpError(404, "Task not found");
    const next = { ...d.tasks[id], ...statePatch(body, d), updatedAt: new Date().toISOString() };
    if (custom) {
      if ("title" in body) custom.title = str(body.title, "title", LIMITS.title, true);
      if ("detail" in body) custom.detail = str(body.detail, "detail", LIMITS.detail);
      if ("pillar" in body) custom.pillar = pillar(body.pillar);
    } else {
      // Plan tasks: an empty title or detail resets it to the plan's wording.
      for (const k of ["title", "detail"] as const) {
        if (!(k in body)) continue;
        const v = str(body[k], k, k === "title" ? LIMITS.title : LIMITS.detail);
        if (v) next[k] = v;
        else delete next[k];
      }
    }
    d.tasks[id] = next;
  });
}

export function createTask(body: Record<string, unknown>) {
  return mutate((d) => {
    const id = `custom:${randomUUID().slice(0, 8)}`;
    d.custom.push({
      id,
      title: str(body.title, "title", LIMITS.title, true),
      detail: str(body.detail, "detail", LIMITS.detail),
      pillar: pillar(body.pillar),
      createdAt: new Date().toISOString(),
    });
    d.tasks[id] = { ...statePatch(body, d), updatedAt: new Date().toISOString() };
  });
}

const exists = (d: BoardData, id: string) => isPlanTaskId(id) || d.custom.some((c) => c.id === id);

/** Takes a task off the board. Its owner, status and notes are kept so it can be restored. */
export function removeTask(id: string) {
  return mutate((d) => {
    if (!exists(d, id)) throw new HttpError(404, "Task not found");
    if (!d.removed.includes(id)) d.removed.push(id);
  });
}

/** Puts a removed task back on the board. */
export function restoreTask(id: string) {
  return mutate((d) => {
    if (!exists(d, id)) throw new HttpError(404, "Task not found");
    d.removed = d.removed.filter((r) => r !== id);
  });
}

/** Permanently deletes a custom task. Plan tasks can only be removed, since they come from the plan. */
export function deleteTaskForever(id: string) {
  return mutate((d) => {
    if (isPlanTaskId(id)) throw new HttpError(400, "Plan tasks can't be deleted permanently, only removed from the board");
    if (!d.custom.some((c) => c.id === id)) throw new HttpError(404, "Task not found");
    d.custom = d.custom.filter((c) => c.id !== id);
    d.removed = d.removed.filter((r) => r !== id);
    delete d.tasks[id];
  });
}

export function addMember(body: Record<string, unknown>) {
  return mutate((d) => {
    const name = str(body.name, "name", LIMITS.name, true);
    const email = str(body.email, "email", LIMITS.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "email looks invalid");
    if (d.members.some((m) => m.name.toLowerCase() === name.toLowerCase()))
      throw new HttpError(409, `${name} is already on the team`);
    d.members.push({ id: `m_${randomUUID().slice(0, 8)}`, name, role: str(body.role, "role", LIMITS.role), email });
  });
}

/** Edits a member's name, role or email. Only the fields present are changed. */
export function updateMember(id: string, body: Record<string, unknown>) {
  return mutate((d) => {
    const m = d.members.find((x) => x.id === id);
    if (!m) throw new HttpError(404, "Member not found");
    if ("name" in body) {
      const name = str(body.name, "name", LIMITS.name, true);
      if (d.members.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase()))
        throw new HttpError(409, `${name} is already on the team`);
      m.name = name;
    }
    if ("role" in body) m.role = str(body.role, "role", LIMITS.role);
    if ("email" in body) {
      const email = str(body.email, "email", LIMITS.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "email looks invalid");
      m.email = email;
    }
  });
}

/** Removes a member and returns their tasks to unassigned. */
export function removeMember(id: string) {
  return mutate((d) => {
    if (!d.members.some((m) => m.id === id)) throw new HttpError(404, "Member not found");
    d.members = d.members.filter((m) => m.id !== id);
    for (const s of Object.values(d.tasks)) if (s.assigneeId === id) s.assigneeId = null;
  });
}

/** Wraps a route body: JSON errors for HttpError, 500 for anything else. */
export async function handle(fn: () => Promise<BoardData>) {
  try {
    return Response.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong saving tasks" }, { status: 500 });
  }
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (b && typeof b === "object" && !Array.isArray(b)) return b;
  } catch {}
  throw new HttpError(400, "Expected a JSON object body");
}
