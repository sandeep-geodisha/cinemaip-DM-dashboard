// Server-only store for the task board: one readable JSON document.
//
// Where it lives:
// - Locally (and on any normal server): a JSON file, data/tasks.json by
//   default (set TASKS_FILE to move it).
// - On Vercel: Upstash Redis, which Vercel's Storage tab connects for you
//   (it sets KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_*).
//   Vercel has no permanent disk, so a file can't be used there.
//
// Safety, in both cases:
// - Saves are compare-and-swap: a change is only written if nobody else saved
//   in between; otherwise it is re-applied to the latest board and retried.
//   Simultaneous edits never overwrite each other.
// - Before writes, a copy is kept (at most one every few minutes, plus before
//   upgrades, imports and deletions): data/backups/ for the file, a capped
//   list in Redis otherwise. Files you put in data/backups/ are never touched.
// - On read the board is checked and tidied (missing ids, unknown owners,
//   missing plan tasks). If the file isn't valid JSON, the page keeps showing
//   the last good copy and edits pause, so a hand-edit typo is never
//   overwritten.
// - Files from the first version of the board are upgraded, after a backup.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { PILLARS, type Pillar } from "@/lib/plan";
import {
  ACTIVITY_CAP,
  KINDS,
  LIMITS,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  formatDate,
  isPlanTaskId,
  planCatalogue,
  planTextById,
  seedTask,
  type ActivityEntry,
  type BoardFile,
  type BoardResponse,
  type Member,
  type Priority,
  type Status,
  type Task,
} from "@/lib/tasks";

const KEEP_BACKUPS = 60;
const BACKUP_EVERY_MS = 5 * 60 * 1000;
const RESPONSE_ACTIVITY = 150;
const MAX_ATTEMPTS = 8;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

class FileError extends Error {}

// Shared across every route bundle in this process.
const g = globalThis as typeof globalThis & {
  __cinemaipTaskLock?: Promise<unknown>;
  __cinemaipLastGood?: BoardFile;
  __cinemaipLastBackup?: number;
};

/** Orders work within one process (the file backend relies on it; Redis uses compare-and-swap). */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = (g.__cinemaipTaskLock ?? Promise.resolve()).then(fn);
  g.__cinemaipTaskLock = run.catch(() => {});
  return run;
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}${randomUUID().slice(0, 8)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Storage backends                                                    */
/* ------------------------------------------------------------------ */

type Snapshot = { text: string | null; etag: string };

interface Backend {
  name: "file" | "redis" | "none";
  /** Where the board lives, for messages. */
  where: string;
  /** How often pages should check for changes. */
  pollMs: number;
  read(): Promise<Snapshot>;
  etag(): Promise<string>;
  /** Writes only if the stored etag still equals `expected`. Returns the new etag, or null if someone saved first. */
  write(text: string, expected: string): Promise<string | null>;
  backup(text: string, reason: string, force: boolean): Promise<void>;
}

function fileBackend(): Backend {
  const FILE = process.env.TASKS_FILE ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "tasks.json");
  const DIR = path.join(/*turbopackIgnore: true*/ path.dirname(FILE), "backups");
  const PREFIX = "auto-";
  const etag = async () => {
    try {
      const s = await stat(/*turbopackIgnore: true*/ FILE);
      return `${Math.round(s.mtimeMs)}-${s.size}`;
    } catch {
      return "none";
    }
  };
  return {
    name: "file",
    where: path.relative(/*turbopackIgnore: true*/ process.cwd(), FILE) || FILE,
    pollMs: 4000,
    etag,
    async read() {
      const tag = await etag();
      if (tag === "none") return { text: null, etag: tag };
      try {
        return { text: await readFile(/*turbopackIgnore: true*/ FILE, "utf8"), etag: tag };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return { text: null, etag: "none" };
        throw new FileError(`Can't read ${path.basename(FILE)}: ${(e as Error).message}`);
      }
    },
    async write(text, expected) {
      // Callers hold the process lock, so only a hand edit can slip in between; check for it.
      if ((await etag()) !== expected) return null;
      await mkdir(/*turbopackIgnore: true*/ path.dirname(FILE), { recursive: true });
      const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(/*turbopackIgnore: true*/ tmp, text);
      await rename(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ FILE);
      return etag();
    },
    async backup(text, reason, force) {
      const t = Date.now();
      if (!force && g.__cinemaipLastBackup && t - g.__cinemaipLastBackup < BACKUP_EVERY_MS) return;
      await mkdir(/*turbopackIgnore: true*/ DIR, { recursive: true });
      const stamp = new Date(t).toISOString().replace(/[:.]/g, "-");
      await writeFile(/*turbopackIgnore: true*/ path.join(DIR, `${PREFIX}${stamp}-${reason}.json`), text);
      g.__cinemaipLastBackup = t;
      const autos = (await readdir(/*turbopackIgnore: true*/ DIR)).filter((f) => f.startsWith(PREFIX) && f.endsWith(".json")).sort();
      for (const f of autos.slice(0, Math.max(0, autos.length - KEEP_BACKUPS)))
        await unlink(/*turbopackIgnore: true*/ path.join(DIR, f)).catch(() => {});
    },
  };
}

// Atomically: write only if the etag is unchanged. KEYS = [board, etag]; ARGV = [text, expected, next].
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[2])
if (cur == false and ARGV[2] == 'none') or cur == ARGV[2] then
  redis.call('SET', KEYS[1], ARGV[1])
  redis.call('SET', KEYS[2], ARGV[3])
  return 1
end
return 0`;

function redisBackend(url: string, token: string): Backend {
  const redis = new Redis({ url, token, automaticDeserialization: false });
  const KEY = process.env.TASKS_REDIS_KEY ?? "cinemaip:board";
  const ETAG = `${KEY}:etag`;
  const BACKUPS = `${KEY}:backups`;
  return {
    name: "redis",
    where: "Upstash Redis",
    pollMs: 10000,
    async etag() {
      return (await redis.get<string>(ETAG)) ?? "none";
    },
    async read() {
      const [text, tag] = await redis.mget<[string | null, string | null]>(KEY, ETAG);
      return { text: text ?? null, etag: tag ?? "none" };
    },
    async write(text, expected) {
      const next = randomUUID();
      const ok = await redis.eval<[string, string, string], number>(CAS_SCRIPT, [KEY, ETAG], [text, expected, next]);
      return Number(ok) === 1 ? next : null;
    },
    async backup(text, reason, force) {
      // One automatic copy per few minutes across all servers.
      if (!force && !(await redis.set(`${BACKUPS}:recent`, "1", { nx: true, px: BACKUP_EVERY_MS }))) return;
      const p = redis.pipeline();
      p.lpush(BACKUPS, JSON.stringify({ at: now(), reason, board: text }));
      p.ltrim(BACKUPS, 0, KEEP_BACKUPS - 1);
      await p.exec();
    },
  };
}

const NOT_CONFIGURED =
  "This site is on Vercel, which can't save files, and no database is connected yet. In Vercel, open the project → Storage → Create → Upstash for Redis → connect it to this project, then redeploy.";

function noneBackend(): Backend {
  return {
    name: "none",
    where: "nowhere (storage not set up)",
    pollMs: 60000,
    etag: async () => "none",
    read: async () => ({ text: null, etag: "none" }),
    write: async () => {
      throw new HttpError(503, NOT_CONFIGURED);
    },
    backup: async () => {},
  };
}

/**
 * Finds Upstash REST credentials. Vercel names them KV_REST_API_URL/TOKEN, or
 * <PREFIX>_KV_REST_API_URL/TOKEN when a custom prefix was chosen while
 * connecting the store; Upstash itself uses UPSTASH_REDIS_REST_URL/TOKEN.
 * The read-only token is never used, since the board needs to write.
 */
function redisCredentials(): { url: string; token: string } | null {
  const env = process.env;
  const preferred: [string, string][] = [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ];
  const prefixed = Object.keys(env)
    .filter((k) => /(?:KV_REST_API|REDIS_REST)_URL$/.test(k))
    .sort()
    .map((k): [string, string] => [k, k.replace(/_URL$/, "_TOKEN")]);
  for (const [u, t] of [...preferred, ...prefixed]) if (env[u] && env[t]) return { url: env[u]!, token: env[t]! };
  return null;
}

let backendCache: Backend | null = null;
function backend(): Backend {
  if (backendCache) return backendCache;
  const creds = redisCredentials();
  backendCache = creds ? redisBackend(creds.url, creds.token) : process.env.VERCEL ? noneBackend() : fileBackend();
  return backendCache;
}

const serialise = (b: BoardFile) => JSON.stringify(b, null, 2) + "\n";

function parse(text: string | null): unknown {
  if (text === null || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new FileError(`The board data isn't valid JSON (${(e as Error).message}).`);
  }
}

/* ------------------------------------------------------------------ */
/* Normalising (also upgrades version 1 files)                         */
/* ------------------------------------------------------------------ */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const longText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const isoOr = (v: unknown, fallback: string) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : fallback);
const dateOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const pillarOrNull = (v: unknown): Pillar | null => (PILLARS.includes(v as Pillar) ? (v as Pillar) : null);

function normaliseMember(v: unknown, ts: string): Member | null {
  if (!isObj(v)) return null;
  const name = text(v.name, LIMITS.name);
  if (!name) return null;
  return {
    id: typeof v.id === "string" && v.id ? v.id : newId("m_"),
    name,
    role: text(v.role, LIMITS.role),
    email: text(v.email, LIMITS.email),
    addedAt: isoOr(v.addedAt, ts),
    updatedAt: isoOr(v.updatedAt, ts),
  };
}

function normaliseTask(v: Obj, ts: string): Task | null {
  const id = typeof v.id === "string" ? v.id : "";
  const plan = planTextById().get(id);
  const type = plan ? plan.type : pick(v.type, KINDS, "custom");
  if (!id || (type !== "custom" && !plan)) return null;
  const title = text(v.title, LIMITS.title) || plan?.title || "";
  if (!title) return null;
  const pillar = plan ? plan.pillar : pillarOrNull(v.pillar);
  return {
    id,
    type,
    title,
    summary: typeof v.summary === "string" ? text(v.summary, LIMITS.summary) : (plan?.summary ?? ""),
    description: typeof v.description === "string" ? longText(v.description, LIMITS.description) : (plan?.description ?? ""),
    context: plan ? plan.context : pillar ? `Custom · ${pillar}` : "Custom task",
    pillar,
    assigneeId: typeof v.assigneeId === "string" && v.assigneeId ? v.assigneeId : null,
    assignee: null, // filled from the team below
    status: pick(v.status, STATUSES, "todo"),
    priority: pick(v.priority, PRIORITIES, type === "decision" ? "high" : "medium"),
    due: dateOrNull(v.due),
    notes: longText(v.notes, LIMITS.notes),
    removed: v.removed === true,
    createdAt: isoOr(v.createdAt, ts),
    updatedAt: isoOr(v.updatedAt, ts),
    updatedBy: typeof v.updatedBy === "string" && v.updatedBy ? v.updatedBy : null,
  };
}

/** Turns a version 1 file (state keyed by id) into version 2 objects. */
function upgradeV1(raw: Obj, ts: string): Obj {
  const state = isObj(raw.tasks) ? raw.tasks : {};
  const removed = new Set(Array.isArray(raw.removed) ? raw.removed : []);
  const s = (id: string) => (isObj(state[id]) ? (state[id] as Obj) : {});
  const tasks: Obj[] = planCatalogue().map((p) => {
    const st = s(p.id);
    return {
      ...seedTask(p, ts),
      ...st,
      id: p.id,
      title: typeof st.title === "string" && st.title ? st.title : p.title,
      summary: typeof st.detail === "string" && st.detail ? st.detail : p.summary,
      description: p.description,
      removed: removed.has(p.id),
      updatedAt: isoOr(st.updatedAt, ts),
    };
  });
  for (const c of Array.isArray(raw.custom) ? raw.custom : []) {
    if (!isObj(c) || typeof c.id !== "string") continue;
    const st = s(c.id);
    tasks.push({
      ...st,
      id: c.id,
      type: "custom",
      title: c.title,
      summary: c.detail ?? "",
      description: "",
      pillar: c.pillar ?? null,
      removed: removed.has(c.id),
      createdAt: c.createdAt,
      updatedAt: isoOr(st.updatedAt, ts),
    });
  }
  return {
    version: 2,
    rev: 1,
    updatedAt: ts,
    team: Array.isArray(raw.members) ? raw.members : [],
    tasks,
    activity: [
      { id: newId("a_"), at: ts, by: "System", taskId: null, subject: "Data file", action: "upgraded to version 2 (full task details stored)" },
    ],
  };
}

/** Checks and tidies anything read from disk. Idempotent: normalising its own output changes nothing. */
function normalise(raw: unknown): BoardFile {
  const ts = now();
  let src: Obj;
  if (raw === null) src = { version: 2, rev: 0, updatedAt: ts, team: [], tasks: [], activity: [] };
  else if (!isObj(raw)) throw new FileError("The data file must contain a JSON object.");
  else src = raw.version === 2 ? raw : upgradeV1(raw, ts);

  // Team: valid, unique ids and names.
  const team: Member[] = [];
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  for (const v of Array.isArray(src.team) ? src.team : []) {
    const m = normaliseMember(v, ts);
    if (!m || seenNames.has(m.name.toLowerCase())) continue;
    if (seenIds.has(m.id)) m.id = newId("m_");
    seenNames.add(m.name.toLowerCase());
    seenIds.add(m.id);
    team.push(m);
  }

  // Tasks: valid, unique, plus any plan task not yet in the file.
  const tasks: Task[] = [];
  const seenTasks = new Set<string>();
  for (const v of Array.isArray(src.tasks) ? src.tasks : []) {
    if (!isObj(v)) continue;
    const t = normaliseTask(v, ts);
    if (!t || seenTasks.has(t.id)) continue;
    seenTasks.add(t.id);
    tasks.push(t);
  }
  for (const p of planCatalogue()) if (!seenTasks.has(p.id)) tasks.push(seedTask(p, ts));

  // Owners must exist; keep owner names in step with the team.
  const byId = new Map(team.map((m) => [m.id, m]));
  for (const t of tasks) {
    const m = t.assigneeId ? byId.get(t.assigneeId) : undefined;
    t.assigneeId = m ? m.id : null;
    t.assignee = m ? m.name : null;
  }

  const activity: ActivityEntry[] = (Array.isArray(src.activity) ? src.activity : [])
    .filter(isObj)
    .map((a) => ({
      id: typeof a.id === "string" ? a.id : newId("a_"),
      at: isoOr(a.at, ts),
      by: text(a.by, LIMITS.name) || "Someone",
      taskId: typeof a.taskId === "string" ? a.taskId : null,
      subject: text(a.subject, LIMITS.title),
      action: text(a.action, 500),
    }))
    .slice(0, ACTIVITY_CAP);

  return {
    version: 2,
    rev: typeof src.rev === "number" && src.rev >= 0 ? Math.floor(src.rev) : 0,
    updatedAt: isoOr(src.updatedAt, ts),
    team,
    tasks,
    activity,
  };
}

/* ------------------------------------------------------------------ */
/* Load / save                                                         */
/* ------------------------------------------------------------------ */

type Loaded = { board: BoardFile; etag: string; fileError?: string };

const strip = (b: unknown) => JSON.stringify({ ...(b as Obj), rev: 0, updatedAt: 0 });

/** Reads and tidies the board. If tidying changed anything (upgrade, new ids...), saves it. */
async function load(): Promise<Loaded> {
  const be = backend();
  const snap = await be.read();
  let raw: unknown;
  let board: BoardFile;
  try {
    raw = parse(snap.text);
    board = normalise(raw);
  } catch (e) {
    if (e instanceof FileError) {
      const msg = be.name === "file" ? `${be.where}: ${e.message}` : e.message;
      if (g.__cinemaipLastGood) return { board: g.__cinemaipLastGood, etag: snap.etag, fileError: msg };
      throw new HttpError(500, `${msg} Fix it, or restore a backup.`);
    }
    throw e;
  }
  if (be.name === "none") return { board, etag: snap.etag, fileError: NOT_CONFIGURED };

  let etag = snap.etag;
  if (raw === null || strip(raw) !== strip(board)) {
    const upgrading = isObj(raw) && raw.version !== 2;
    if (snap.text) await be.backup(snap.text, upgrading ? "before-upgrade" : "before-tidy", true);
    board.rev += 1;
    board.updatedAt = now();
    // If someone saved meanwhile, skip; the next read tidies their version.
    etag = (await be.write(serialise(board), snap.etag)) ?? etag;
  }
  g.__cinemaipLastGood = board;
  return { board, etag };
}

function respond(board: BoardFile, etag: string, fileError?: string): BoardResponse {
  return {
    ...board,
    activity: board.activity.slice(0, RESPONSE_ACTIVITY),
    etag,
    storage: backend().name,
    pollMs: backend().pollMs,
    ...(fileError && { fileError }),
  };
}

/** The board for GET. Returns null when the caller's etag is still current. */
export async function readBoard(etag?: string | null): Promise<BoardResponse | null> {
  if (etag && etag !== "none" && etag === (await backend().etag())) return null;
  return withLock(async () => {
    const { board, etag: tag, fileError } = await load();
    return respond(board, tag, fileError);
  });
}

/** The whole board, for download. */
export async function exportBoard(): Promise<BoardFile> {
  return withLock(async () => (await load()).board);
}

type Ctx = { by: string; log: (subject: string, action: string, taskId?: string | null) => void };

/**
 * Loads the latest board, applies `fn`, records activity and saves with
 * compare-and-swap. If someone else saved first, it starts again from their
 * version, so no change is lost. `fn` must be safe to run more than once.
 */
function mutate(actorId: string | null, fn: (d: BoardFile, ctx: Ctx) => void, opts: { forceBackup?: string } = {}) {
  return withLock(async () => {
    const be = backend();
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { board, etag, fileError } = await load();
      if (fileError)
        throw new HttpError(
          be.name === "none" ? 503 : 409,
          be.name === "none" ? fileError : `${fileError} Changes are paused so nothing is overwritten. Fix it, or restore a backup.`,
        );
      const d: BoardFile = structuredClone(board);
      const by = d.team.find((m) => m.id === actorId)?.name ?? "Someone";
      const entries: ActivityEntry[] = [];
      const ts = now();
      fn(d, { by, log: (subject, action, taskId = null) => entries.push({ id: newId("a_"), at: ts, by, taskId, subject, action }) });

      const byId = new Map(d.team.map((m) => [m.id, m]));
      for (const t of d.tasks) {
        const m = t.assigneeId ? byId.get(t.assigneeId) : undefined;
        t.assigneeId = m ? m.id : null;
        t.assignee = m ? m.name : null;
      }
      d.activity = [...entries.reverse(), ...d.activity].slice(0, ACTIVITY_CAP);
      d.rev += 1;
      d.updatedAt = ts;

      await be.backup(serialise(board), opts.forceBackup ?? "auto", !!opts.forceBackup);
      const next = await be.write(serialise(d), etag);
      if (next) {
        g.__cinemaipLastGood = d;
        return respond(d, next);
      }
      // Someone saved first: back off briefly and re-apply on top of their version.
      await sleep(25 * 2 ** attempt + Math.random() * 40);
    }
    throw new HttpError(409, "The board is very busy right now and that change couldn't be saved. Please try again.");
  });
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const str = (v: unknown, field: string, max: number, required = false, long = false) => {
  if (v === undefined || v === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return "";
  }
  if (typeof v !== "string") throw new HttpError(400, `${field} must be text`);
  const s = long ? v.replace(/\r\n/g, "\n").trim() : v.trim();
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
};

const oneOf = <T extends string>(v: unknown, list: readonly T[], field: string): T => {
  if (!list.includes(v as T)) throw new HttpError(400, `${field} must be one of ${list.join(", ")}`);
  return v as T;
};

const dueDate = (v: unknown): string | null => {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
    throw new HttpError(400, "due must be a YYYY-MM-DD date");
  return v;
};

const pillarField = (v: unknown): Pillar | null => (v === null || v === undefined || v === "" ? null : oneOf(v, PILLARS, "pillar"));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const email = (v: unknown) => {
  const e = str(v, "email", LIMITS.email);
  if (e && !EMAIL.test(e)) throw new HttpError(400, `"${e}" doesn't look like an email address`);
  return e;
};

const short = (s: string, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* ------------------------------------------------------------------ */
/* Task operations                                                     */
/* ------------------------------------------------------------------ */

function findTask(d: BoardFile, id: string) {
  const t = d.tasks.find((x) => x.id === id);
  if (!t) throw new HttpError(404, "Task not found");
  return t;
}

/** Applies owner/status/priority/due/notes from `body` and returns readable change notes. */
function applyState(d: BoardFile, t: Task, body: Obj): string[] {
  const changes: string[] = [];
  if ("assigneeId" in body) {
    const a = body.assigneeId;
    if (a !== null && !d.team.some((m) => m.id === a)) throw new HttpError(400, "That person isn't on the team any more");
    const next = (a as string | null) ?? null;
    if (next !== t.assigneeId) {
      t.assigneeId = next;
      changes.push(next ? `assigned to ${d.team.find((m) => m.id === next)!.name}` : "unassigned");
    }
  }
  if ("status" in body) {
    const s = oneOf<Status>(body.status, STATUSES, "status");
    if (s !== t.status) changes.push(`status ${STATUS_LABEL[t.status]} → ${STATUS_LABEL[s]}`);
    t.status = s;
  }
  if ("priority" in body) {
    const p = oneOf<Priority>(body.priority, PRIORITIES, "priority");
    if (p !== t.priority) changes.push(`priority → ${PRIORITY_LABEL[p]}`);
    t.priority = p;
  }
  if ("due" in body) {
    const due = dueDate(body.due);
    if (due !== t.due) changes.push(due ? `due date → ${formatDate(due)}` : "due date cleared");
    t.due = due;
  }
  if ("notes" in body) {
    const n = str(body.notes, "notes", LIMITS.notes, false, true);
    if (n !== t.notes) changes.push(n ? "edited notes" : "cleared notes");
    t.notes = n;
  }
  return changes;
}

export function updateTask(id: string, body: Obj, actorId: string | null) {
  return mutate(actorId, (d, ctx) => {
    const t = findTask(d, id);
    const before = t.title;
    const plan = planTextById().get(id);
    const changes: string[] = [];

    const wording: [keyof Pick<Task, "title" | "summary" | "description">, number, string][] = [
      ["title", LIMITS.title, "title"],
      ["summary", LIMITS.summary, "summary"],
      ["description", LIMITS.description, "description"],
    ];
    for (const [k, max, label] of wording) {
      if (!(k in body)) continue;
      let v = str(body[k], label, max, false, k === "description");
      // Empty resets plan tasks to the plan's wording; custom tasks need a title.
      if (!v && plan) v = plan[k];
      if (!v && k === "title") throw new HttpError(400, "title is required");
      if (v === t[k]) continue;
      t[k] = v;
      changes.push(plan && v === plan[k] ? `reset ${label} to the plan` : k === "title" ? `renamed to “${short(v)}”` : `edited ${label}`);
    }
    if ("pillar" in body && t.type === "custom") {
      const p = pillarField(body.pillar);
      if (p !== t.pillar) changes.push(p ? `pillar → ${p}` : "pillar cleared");
      t.pillar = p;
      t.context = p ? `Custom · ${p}` : "Custom task";
    }
    changes.push(...applyState(d, t, body));
    if (!changes.length) return;
    t.updatedAt = now();
    t.updatedBy = ctx.by;
    ctx.log(before, changes.join("; "), id);
  });
}

export function createTask(body: Obj, actorId: string | null) {
  return mutate(actorId, (d, ctx) => {
    const ts = now();
    const pillar = pillarField(body.pillar);
    const t: Task = {
      id: newId("custom:"),
      type: "custom",
      title: str(body.title, "title", LIMITS.title, true),
      summary: str(body.summary, "summary", LIMITS.summary),
      description: str(body.description, "description", LIMITS.description, false, true),
      context: pillar ? `Custom · ${pillar}` : "Custom task",
      pillar,
      assigneeId: null,
      assignee: null,
      status: "todo",
      priority: "medium",
      due: null,
      notes: "",
      removed: false,
      createdAt: ts,
      updatedAt: ts,
      updatedBy: ctx.by,
    };
    const extra = applyState(d, t, body);
    d.tasks.push(t);
    ctx.log(t.title, ["created the task", ...extra].join("; "), t.id);
  });
}

export function removeTask(id: string, actorId: string | null) {
  return mutate(actorId, (d, ctx) => {
    const t = findTask(d, id);
    if (t.removed) return;
    t.removed = true;
    t.updatedAt = now();
    t.updatedBy = ctx.by;
    ctx.log(t.title, "removed from the board", id);
  });
}

export function restoreTask(id: string, actorId: string | null) {
  return mutate(actorId, (d, ctx) => {
    const t = findTask(d, id);
    if (!t.removed) return;
    t.removed = false;
    t.updatedAt = now();
    t.updatedBy = ctx.by;
    ctx.log(t.title, "restored to the board", id);
  });
}

/** Permanently deletes a custom task. Plan tasks can only be removed, since they come from the plan. */
export function deleteTaskForever(id: string, actorId: string | null) {
  return mutate(
    actorId,
    (d, ctx) => {
      if (isPlanTaskId(id)) throw new HttpError(400, "Plan tasks can't be deleted permanently, only removed from the board");
      const t = findTask(d, id);
      d.tasks = d.tasks.filter((x) => x.id !== id);
      ctx.log(t.title, "deleted permanently", id);
    },
    { forceBackup: "before-delete" },
  );
}

/* ------------------------------------------------------------------ */
/* Team operations                                                     */
/* ------------------------------------------------------------------ */

function memberFields(body: Obj, d: BoardFile, selfId?: string) {
  const out: Partial<Member> = {};
  if ("name" in body || !selfId) {
    const name = str(body.name, "name", LIMITS.name, true);
    if (d.team.some((m) => m.id !== selfId && m.name.toLowerCase() === name.toLowerCase()))
      throw new HttpError(409, `${name} is already on the team`);
    out.name = name;
  }
  if ("role" in body) out.role = str(body.role, "role", LIMITS.role);
  if ("email" in body) out.email = email(body.email);
  return out;
}

export function addMember(body: Obj, actorId: string | null) {
  return mutate(actorId, (d, ctx) => {
    const f = memberFields(body, d);
    const ts = now();
    const m: Member = { id: newId("m_"), name: f.name!, role: f.role ?? "", email: f.email ?? "", addedAt: ts, updatedAt: ts };
    d.team.push(m);
    ctx.log(m.name, "added to the team");
  });
}

export function updateMember(id: string, body: Obj, actorId: string | null) {
  return mutate(actorId, (d, ctx) => {
    const m = d.team.find((x) => x.id === id);
    if (!m) throw new HttpError(404, "That person isn't on the team any more");
    const f = memberFields(body, d, id);
    const changes: string[] = [];
    if (f.name !== undefined && f.name !== m.name) changes.push(`renamed from ${m.name}`);
    if (f.role !== undefined && f.role !== m.role) changes.push(f.role ? `role → ${f.role}` : "role cleared");
    if (f.email !== undefined && f.email !== m.email) changes.push(f.email ? `email → ${f.email}` : "email cleared");
    if (!changes.length) return;
    Object.assign(m, f, { updatedAt: now() });
    ctx.log(m.name, changes.join("; "));
  });
}

/** Removes a member; their tasks become unassigned. */
export function removeMember(id: string, actorId: string | null) {
  return mutate(
    actorId,
    (d, ctx) => {
      const m = d.team.find((x) => x.id === id);
      if (!m) throw new HttpError(404, "That person isn't on the team any more");
      d.team = d.team.filter((x) => x.id !== id);
      const freed = d.tasks.filter((t) => t.assigneeId === id);
      for (const t of freed) {
        t.assigneeId = null;
        t.updatedAt = now();
      }
      ctx.log(m.name, `removed from the team${freed.length ? `; ${freed.length} task${freed.length === 1 ? "" : "s"} now unassigned` : ""}`);
    },
    { forceBackup: "before-remove-member" },
  );
}

export type ImportResult = { added: number; updated: number; skipped: { entry: string; reason: string }[] };

/**
 * Adds people from a JSON list: [{ name, role?, email? }], or an object with a
 * "team" or "members" array (so a downloaded board file works too).
 * Matches existing people by email, then name; fills in a missing role or email.
 */
export async function importMembers(body: unknown, actorId: string | null) {
  const list = Array.isArray(body) ? body : isObj(body) ? (body.team ?? body.members) : null;
  if (!Array.isArray(list)) throw new HttpError(400, 'Expected a list of people: [{"name": "...", "role": "...", "email": "..."}]');
  if (list.length > 500) throw new HttpError(400, "That's more than 500 people; split the file");
  const result: ImportResult = { added: 0, updated: 0, skipped: [] };
  const board = await mutate(
    actorId,
    (d, ctx) => {
      const ts = now();
      Object.assign(result, { added: 0, updated: 0, skipped: [] });
      for (const [i, raw] of list.entries()) {
        const label = isObj(raw) && typeof raw.name === "string" ? raw.name : `entry ${i + 1}`;
        if (!isObj(raw)) {
          result.skipped.push({ entry: label, reason: "not an object" });
          continue;
        }
        const name = text(raw.name, LIMITS.name);
        const role = text(raw.role, LIMITS.role);
        const mail = text(raw.email, LIMITS.email);
        if (!name) {
          result.skipped.push({ entry: label, reason: "missing name" });
          continue;
        }
        if (mail && !EMAIL.test(mail)) {
          result.skipped.push({ entry: name, reason: `invalid email "${mail}"` });
          continue;
        }
        const existing =
          (mail && d.team.find((m) => m.email && m.email.toLowerCase() === mail.toLowerCase())) ||
          d.team.find((m) => m.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          const patch: Partial<Member> = {};
          if (role && role !== existing.role) patch.role = role;
          if (mail && mail !== existing.email) patch.email = mail;
          if (Object.keys(patch).length) {
            Object.assign(existing, patch, { updatedAt: ts });
            result.updated++;
          } else result.skipped.push({ entry: name, reason: "already on the team" });
          continue;
        }
        d.team.push({ id: newId("m_"), name, role, email: mail, addedAt: ts, updatedAt: ts });
        result.added++;
      }
      ctx.log("Team", `imported from JSON: ${result.added} added, ${result.updated} updated, ${result.skipped.length} skipped`);
    },
    { forceBackup: "before-import" },
  );
  return { ...board, result };
}

/* ------------------------------------------------------------------ */
/* Route helpers                                                       */
/* ------------------------------------------------------------------ */

/** Wraps a route body: JSON errors for HttpError, 500 for anything else. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    return Response.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong saving the board. Nothing was changed." }, { status: 500 });
  }
}

export async function jsonBody(req: Request): Promise<Obj> {
  try {
    const b = await req.json();
    if (isObj(b)) return b;
  } catch {}
  throw new HttpError(400, "Expected a JSON object body");
}

export async function anyJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "That isn't valid JSON");
  }
}

/** The person making the change, sent by the page as x-actor-id. */
export const actorOf = (req: Request) => req.headers.get("x-actor-id");
