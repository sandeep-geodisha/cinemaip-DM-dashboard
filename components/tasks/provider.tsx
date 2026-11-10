"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildAllTasks, type BoardData, type Member, type Task, type TaskState } from "@/lib/tasks";
import { TaskEditor } from "@/components/tasks/editor";

type Patch = Partial<Pick<TaskState, "assigneeId" | "status" | "priority" | "due" | "notes">> & {
  title?: string;
  detail?: string;
  pillar?: string | null;
};

type Editing = { mode: "edit"; id: string } | { mode: "new" } | null;

type ToastAction = { label: string; run: () => void };

type Ctx = {
  loaded: boolean;
  /** Tasks on the board. */
  tasks: Task[];
  byId: Map<string, Task>;
  /** Tasks taken off the board, newest first. */
  removedTasks: Task[];
  removedIds: Set<string>;
  members: Member[];
  memberById: Map<string, Member>;
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
  openTask: (id: string) => void;
  openNew: () => void;
  notify: (msg: string, tone?: "ok" | "error", action?: ToastAction) => void;
};

const TasksContext = createContext<Ctx | null>(null);

export function useTasks() {
  const c = useContext(TasksContext);
  if (!c) throw new Error("useTasks must be used inside <TasksProvider>");
  return c;
}

const POLL_MS = 15000;

/**
 * Holds the shared task board. Loads it from /api/tasks, applies edits
 * optimistically, and polls so assignments made by others show up.
 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error"; key: number; action?: ToastAction } | null>(null);
  const pending = useRef(0);

  const notify = useCallback((msg: string, tone: "ok" | "error" = "ok", action?: ToastAction) => {
    setToast({ msg, tone, key: Date.now(), action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.tone === "error" || toast.action ? 7000 : 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const call = useCallback(
    async (url: string, init?: RequestInit): Promise<BoardData | null> => {
      pending.current++;
      try {
        const res = await fetch(url, {
          ...init,
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          notify(json.error ?? `Request failed (${res.status})`, "error");
          return null;
        }
        setData(json as BoardData);
        return json as BoardData;
      } catch {
        notify("Couldn't reach the server. Changes weren't saved.", "error");
        return null;
      } finally {
        pending.current--;
      }
    },
    [notify],
  );

  // Initial load, polling, and refresh when the tab regains focus.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (pending.current > 0) return;
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" });
        if (res.ok && alive && pending.current === 0) setData(await res.json());
      } catch {}
    };
    refresh();
    const iv = window.setInterval(refresh, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const update = useCallback(
    async (id: string, patch: Patch) => {
      // Optimistic: show the change now; the server's reply replaces it.
      setData((d) => {
        if (!d) return d;
        const { title, detail, pillar, ...state } = patch;
        if (d.custom.some((c) => c.id === id)) {
          const custom = d.custom.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...(title !== undefined && { title }),
                  ...(detail !== undefined && { detail }),
                  ...(pillar !== undefined && { pillar: pillar as never }),
                }
              : c,
          );
          return { ...d, custom, tasks: { ...d.tasks, [id]: { ...d.tasks[id], ...state } } };
        }
        // Plan task: wording is stored as an override; empty resets to the plan.
        const next = { ...d.tasks[id], ...state };
        for (const [k, v] of [["title", title], ["detail", detail]] as const) {
          if (v === undefined) continue;
          if (v.trim()) next[k] = v.trim();
          else delete next[k];
        }
        return { ...d, tasks: { ...d.tasks, [id]: next } };
      });
      const ok = !!(await call(`/api/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }));
      if (!ok) {
        const res = await fetch("/api/tasks", { cache: "no-store" }).catch(() => null);
        if (res?.ok) setData(await res.json());
      }
      return ok;
    },
    [call],
  );

  const restore = useCallback(
    async (id: string) => {
      setData((d) => d && { ...d, removed: d.removed.filter((r) => r !== id) });
      return !!(await call(`/api/tasks/${encodeURIComponent(id)}/restore`, { method: "POST" }));
    },
    [call],
  );

  const remove = useCallback(
    async (id: string) => {
      const title = data ? buildAllTasks(data).find((t) => t.id === id)?.title : undefined;
      setData((d) => d && { ...d, removed: d.removed.includes(id) ? d.removed : [...d.removed, id] });
      const ok = !!(await call(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }));
      if (ok)
        notify(title ? `Removed “${title.length > 40 ? title.slice(0, 40) + "…" : title}”` : "Task removed", "ok", {
          label: "Undo",
          run: () => {
            restore(id).then((r) => r && notify("Task restored"));
          },
        });
      return ok;
    },
    [call, data, notify, restore],
  );

  const value = useMemo<Ctx>(() => {
    const all = data ? buildAllTasks(data) : [];
    const removedIds = new Set(data?.removed ?? []);
    const tasks = all.filter((t) => !removedIds.has(t.id));
    const order = data?.removed ?? [];
    const removedTasks = all.filter((t) => removedIds.has(t.id)).sort((a, b) => order.indexOf(b.id) - order.indexOf(a.id));
    const members = data?.members ?? [];
    return {
      loaded: !!data,
      tasks,
      byId: new Map(tasks.map((t) => [t.id, t])),
      removedTasks,
      removedIds,
      members,
      memberById: new Map(members.map((m) => [m.id, m])),
      update,
      create: async (body) => !!(await call("/api/tasks", { method: "POST", body: JSON.stringify(body) })),
      remove,
      restore,
      deleteForever: async (id) =>
        !!(await call(`/api/tasks/${encodeURIComponent(id)}?permanent=1`, { method: "DELETE" })),
      addMember: async (m) => {
        const d = await call("/api/members", { method: "POST", body: JSON.stringify(m) });
        const name = m.name.trim().toLowerCase();
        return d?.members.find((x) => x.name.toLowerCase() === name) ?? null;
      },
      updateMember: async (id, m) =>
        !!(await call(`/api/members/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(m) })),
      removeMember: async (id) => !!(await call(`/api/members/${encodeURIComponent(id)}`, { method: "DELETE" })),
      openTask: (id) => setEditing({ mode: "edit", id }),
      openNew: () => setEditing({ mode: "new" }),
      notify,
    };
  }, [data, call, update, notify, remove, restore]);

  return (
    <TasksContext.Provider value={value}>
      {children}
      <TaskEditor editing={editing} onClose={() => setEditing(null)} />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
        {toast && (
          <div
            key={toast.key}
            className={`toast-in pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm shadow-[var(--shadow)] backdrop-blur-xl ${
              toast.tone === "error"
                ? "border-st-blocked/40 bg-popover/95 text-fg"
                : "border-line-2 bg-popover/95 text-fg"
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${toast.tone === "error" ? "bg-st-blocked" : "bg-st-done"}`} />
            {toast.msg}
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
                className="-my-1 -mr-2 ml-1 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-black transition hover:bg-gold-2"
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
