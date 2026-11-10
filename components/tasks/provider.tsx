"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isBoardResponse, planTextById, type ActivityEntry, type BoardResponse, type Member, type Task } from "@/lib/tasks";
import { TaskEditor } from "@/components/tasks/editor";

export type Patch = Partial<Pick<Task, "assigneeId" | "status" | "priority" | "due" | "notes" | "title" | "summary" | "description">> & {
  pillar?: string | null;
};

type Editing = { mode: "edit"; id: string } | { mode: "new" } | null;
type ToastAction = { label: string; run: () => void };
export type ImportResult = { added: number; updated: number; skipped: { entry: string; reason: string }[] };

type Ctx = {
  loaded: boolean;
  /** Set when the board can't be read or saved; edits are paused. */
  fileError: string | null;
  storage: BoardResponse["storage"] | null;
  /** Tasks on the board. */
  tasks: Task[];
  byId: Map<string, Task>;
  /** Tasks taken off the board, most recently changed first. */
  removedTasks: Task[];
  removedIds: Set<string>;
  members: Member[];
  memberById: Map<string, Member>;
  activity: ActivityEntry[];
  /** The team member using this browser (for "who changed what"). */
  actor: Member | null;
  setActor: (id: string | null) => void;
  update: (id: string, patch: Patch) => Promise<boolean>;
  create: (body: Patch & { title: string }) => Promise<boolean>;
  /** Takes a task off the board, with an Undo toast. */
  remove: (id: string) => Promise<boolean>;
  restore: (id: string) => Promise<boolean>;
  /** Permanently deletes a custom task. */
  deleteForever: (id: string) => Promise<boolean>;
  addMember: (m: { name: string; role?: string; email?: string }) => Promise<Member | null>;
  updateMember: (id: string, m: { name?: string; role?: string; email?: string }) => Promise<boolean>;
  removeMember: (id: string) => Promise<boolean>;
  importMembers: (json: unknown) => Promise<ImportResult | null>;
  openTask: (id: string) => void;
  openNew: () => void;
  /** Board owner filter: "" everyone, "none" unassigned, or a member id. */
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  /** Filters the board to one person (or "none") and scrolls to it. */
  showTasksFor: (v: string) => void;
  notify: (msg: string, tone?: "ok" | "error", action?: ToastAction) => void;
};

const TasksContext = createContext<Ctx | null>(null);

export function useTasks() {
  const c = useContext(TasksContext);
  if (!c) throw new Error("useTasks must be used inside <TasksProvider>");
  return c;
}

const IDLE_AFTER_MS = 10 * 60 * 1000;
const IDLE_POLL_MS = 60 * 1000;

/* "Who am I" is remembered per browser. */
const ACTOR_KEY = "cinemaip-actor";
const actorListeners = new Set<() => void>();
const readActor = () => {
  try {
    return localStorage.getItem(ACTOR_KEY);
  } catch {
    return null;
  }
};
const subscribeActor = (cb: () => void) => {
  actorListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    actorListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const writeActor = (id: string | null) => {
  try {
    if (id) localStorage.setItem(ACTOR_KEY, id);
    else localStorage.removeItem(ACTOR_KEY);
  } catch {}
  actorListeners.forEach((l) => l());
};

/**
 * Holds the shared task board. Loads it from /api/tasks, applies edits
 * optimistically, and polls (cheaply, by etag) so changes made by anyone,
 * including hand edits to the JSON file, show up within a few seconds.
 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BoardResponse | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error"; key: number; action?: ToastAction } | null>(null);
  const pending = useRef(0);
  const etag = useRef<string | null>(null);
  const actorId = useSyncExternalStore(subscribeActor, readActor, () => null);
  const actorRef = useRef<string | null>(null);
  useEffect(() => {
    actorRef.current = actorId;
  }, [actorId]);

  const notify = useCallback((msg: string, tone: "ok" | "error" = "ok", action?: ToastAction) => {
    setToast({ msg, tone, key: Date.now(), action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.tone === "error" || toast.action ? 7000 : 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const accept = useCallback((b: unknown) => {
    if (!isBoardResponse(b)) {
      // Not a board in the current format (e.g. an error page). Keep what we have.
      console.warn("Ignoring unexpected board response", b);
      return false;
    }
    etag.current = b.etag;
    setData(b);
    return true;
  }, []);

  // A page left open across an upgrade can hold data in an older format. Reload it from the server.
  const stale = !!data && !isBoardResponse(data);

  const call = useCallback(
    async (url: string, init?: RequestInit): Promise<(BoardResponse & { result?: ImportResult }) | null> => {
      pending.current++;
      try {
        const res = await fetch(url, {
          ...init,
          headers: { "Content-Type": "application/json", ...(actorRef.current && { "x-actor-id": actorRef.current }) },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(json.error ?? `Request failed (${res.status})`, "error");
          return null;
        }
        if (!accept(json)) {
          notify("The board sent something unexpected. Reloading it…", "error");
          etag.current = null;
          return null;
        }
        return json;
      } catch {
        notify("Couldn't reach the server. That change wasn't saved.", "error");
        return null;
      } finally {
        pending.current--;
      }
    },
    [notify, accept],
  );

  const refresh = useCallback(
    async (force = false) => {
      if (pending.current > 0) return;
      try {
        const q = !force && etag.current ? `?etag=${encodeURIComponent(etag.current)}` : "";
        const res = await fetch(`/api/tasks${q}`, { cache: "no-store" });
        if (res.status === 204 || pending.current > 0) return;
        if (res.ok) accept(await res.json().catch(() => null));
      } catch {}
    },
    [accept],
  );

  useEffect(() => {
    if (stale) {
      etag.current = null;
      refresh(true);
    }
  }, [stale, refresh]);

  // Initial load, then polling while the tab is visible: at the server's pace,
  // slowing down after 10 minutes without any activity. Refresh on focus too.
  const pollMs = data?.pollMs ?? 4000;
  useEffect(() => {
    refresh(true);
  }, [refresh]);
  useEffect(() => {
    let lastActive = Date.now();
    let timer = 0;
    const markActive = () => {
      const wasIdle = Date.now() - lastActive > IDLE_AFTER_MS;
      lastActive = Date.now();
      if (wasIdle) refresh();
    };
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
      const idle = Date.now() - lastActive > IDLE_AFTER_MS;
      timer = window.setTimeout(tick, idle ? Math.max(pollMs, IDLE_POLL_MS) : pollMs);
    };
    timer = window.setTimeout(tick, pollMs);
    const onVis = () => document.visibilityState === "visible" && (markActive(), refresh());
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [refresh, pollMs]);

  const patchLocal = useCallback((id: string, fn: (t: Task) => Task) => {
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t) : t)) });
  }, []);

  const update = useCallback(
    async (id: string, patch: Patch) => {
      // Optimistic: show the change now; the server's reply replaces it.
      const plan = planTextById().get(id);
      patchLocal(id, (t) => {
        const next = { ...t, ...patch } as Task;
        for (const k of ["title", "summary", "description"] as const)
          if (patch[k] !== undefined && !patch[k]?.trim() && plan) next[k] = plan[k];
        return next;
      });
      const ok = !!(await call(`/api/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }));
      if (!ok) refresh(true);
      return ok;
    },
    [call, patchLocal, refresh],
  );

  const restore = useCallback(
    async (id: string) => {
      patchLocal(id, (t) => ({ ...t, removed: false }));
      const ok = !!(await call(`/api/tasks/${encodeURIComponent(id)}/restore`, { method: "POST" }));
      if (!ok) refresh(true);
      return ok;
    },
    [call, patchLocal, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const title = data?.tasks.find((t) => t.id === id)?.title;
      patchLocal(id, (t) => ({ ...t, removed: true }));
      const ok = !!(await call(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }));
      if (!ok) refresh(true);
      else
        notify(title ? `Removed “${title.length > 40 ? title.slice(0, 40) + "…" : title}”` : "Task removed", "ok", {
          label: "Undo",
          run: () => {
            restore(id).then((r) => r && notify("Task restored"));
          },
        });
      return ok;
    },
    [call, data, notify, patchLocal, refresh, restore],
  );

  const value = useMemo<Ctx>(() => {
    const ok = !!data && isBoardResponse(data);
    const all = ok ? data.tasks : [];
    const tasks = all.filter((t) => !t.removed);
    const removedTasks = all.filter((t) => t.removed).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const members = ok ? data.team : [];
    const memberById = new Map(members.map((m) => [m.id, m]));
    return {
      loaded: ok,
      fileError: ok ? (data.fileError ?? null) : null,
      storage: ok ? data.storage : null,
      tasks,
      byId: new Map(tasks.map((t) => [t.id, t])),
      removedTasks,
      removedIds: new Set(removedTasks.map((t) => t.id)),
      members,
      memberById,
      activity: ok ? data.activity : [],
      actor: (actorId && memberById.get(actorId)) || null,
      setActor: writeActor,
      update,
      create: async (body) => !!(await call("/api/tasks", { method: "POST", body: JSON.stringify(body) })),
      remove,
      restore,
      deleteForever: async (id) => !!(await call(`/api/tasks/${encodeURIComponent(id)}?permanent=1`, { method: "DELETE" })),
      addMember: async (m) => {
        const d = await call("/api/members", { method: "POST", body: JSON.stringify(m) });
        const name = m.name.trim().toLowerCase();
        return d?.team.find((x) => x.name.toLowerCase() === name) ?? null;
      },
      updateMember: async (id, m) =>
        !!(await call(`/api/members/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(m) })),
      removeMember: async (id) => !!(await call(`/api/members/${encodeURIComponent(id)}`, { method: "DELETE" })),
      importMembers: async (json) => (await call("/api/members/import", { method: "POST", body: JSON.stringify(json) }))?.result ?? null,
      openTask: (id) => setEditing({ mode: "edit", id }),
      openNew: () => setEditing({ mode: "new" }),
      ownerFilter: ok && (ownerFilter === "" || ownerFilter === "none" || memberById.has(ownerFilter)) ? ownerFilter : "",
      setOwnerFilter,
      showTasksFor: (v) => {
        setOwnerFilter(v);
        requestAnimationFrame(() => document.getElementById("board")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      },
      notify,
    };
  }, [data, actorId, call, update, notify, remove, restore, ownerFilter]);

  return (
    <TasksContext.Provider value={value}>
      {children}
      <TaskEditor editing={editing} onClose={() => setEditing(null)} />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-6">
        {toast && (
          <div
            key={toast.key}
            className={`toast-in pointer-events-auto flex max-w-[min(640px,100%)] items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm shadow-[var(--shadow)] backdrop-blur-xl ${
              toast.tone === "error" ? "border-st-blocked/40 bg-popover/95 text-fg" : "border-line-2 bg-popover/95 text-fg"
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${toast.tone === "error" ? "bg-st-blocked" : "bg-st-done"}`} />
            <span className="min-w-0">{toast.msg}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
                className="-my-1 -mr-2 ml-1 shrink-0 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-black transition hover:bg-gold-2"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </TasksContext.Provider>
  );
}

