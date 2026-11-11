"use client";

import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import { pillarColor } from "@/lib/plan";
import {
  KINDS,
  KIND_LABEL,
  KIND_PLURAL,
  PRIORITIES,
  STATUSES,
  STATUS_LABEL,
  isOverdue,
  todayISO,
  type Kind,
  type Status,
  type Task,
} from "@/lib/tasks";
import { SectionHead } from "@/components/section-head";
import { useTasks } from "@/components/tasks/provider";
import { AssignMenu, Avatar, OwnerChip, PriorityPill, StatusIcon, formatDue, statusColor } from "@/components/tasks/ui";
import { PencilIcon, TrashIcon } from "@/components/tasks/editor";

const PRIORITY_RANK = Object.fromEntries(PRIORITIES.map((p, i) => [p, i]));

function sortTasks(tasks: Task[]) {
  return tasks
    .map((t, i) => ({ t, i }))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.t.priority] - PRIORITY_RANK[b.t.priority] ||
        (a.t.due ?? "9999").localeCompare(b.t.due ?? "9999") ||
        a.i - b.i,
    )
    .map((x) => x.t);
}

export function TaskBoard() {
  const { loaded, tasks, members, memberById, openNew, removedTasks, fileError, activity, storage, ownerFilter: owner, setOwnerFilter: setOwner, actor } = useTasks();
  const [showRemoved, setShowRemoved] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [kind, setKind] = useState<Kind | "">("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "list">("board");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTasks(
      tasks.filter(
        (t) =>
          (!kind || t.type === kind) &&
          (!owner || (owner === "none" ? t.assigneeIds.length === 0 : t.assigneeIds.includes(owner))) &&
          (!q || `${t.title} ${t.summary} ${t.description} ${t.context} ${t.notes} ${t.assignees.join(" ")}`.toLowerCase().includes(q)),
      ),
    );
  }, [tasks, kind, owner, query]);

  return (
    <section id="board" className="scroll-mt-24">
      <SectionHead
        n="03"
        kicker="Task board"
        title={
          <>
            Who is doing <em className="gold-text not-italic">what</em>, and by when
          </>
        }
        lede="Every decision and every calendar activity is a task with its own brief: the steps, what done looks like and how it is measured. Give each one owners (one person or several), a due date and a status. Every change is saved straight away, so the whole team sees the same board."
      />

      {fileError && (
        <div role="alert" className="mt-10 rounded-2xl border border-st-blocked/50 bg-st-blocked/[0.08] px-5 py-4 text-sm">
          <p className="font-medium text-st-blocked">
            {storage === "none" ? "Saving isn't set up on this site yet" : "The board can't be read, so changes are paused"}
          </p>
          <p className="mt-1 text-muted">
            {fileError}
            {storage === "file" && (
              <>
                {" "}
                You&apos;re seeing the last saved version. Fix <code className="font-mono">data/tasks.json</code>, or copy a good version back from{" "}
                <code className="font-mono">data/backups/</code>; the board picks it up within a few seconds.
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-12">
        <Progress />
      </div>

      {/* Toolbar */}
      <div data-reveal className="mt-8 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Task type">
          {(["", ...KINDS] as const).map((k) => {
            const on = kind === k;
            const n = k ? tasks.filter((t) => t.type === k).length : tasks.length;
            return (
              <button
                key={k || "all"}
                role="radio"
                aria-checked={on}
                onClick={() => setKind(k)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${
                  on ? "border-gold/60 bg-gold/10 text-fg" : "border-line bg-panel text-muted hover:border-line-2 hover:text-fg"
                }`}
              >
                {k ? KIND_PLURAL[k] : "All tasks"}
                <span className="tabular text-xs text-faint">{loaded ? n : "–"}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search tasks</span>
            <svg viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="w-44 rounded-full border border-line bg-panel py-1.5 pr-3 pl-8 text-sm placeholder:text-faint focus:border-gold/60 focus:outline-none"
            />
          </label>
          {actor && (
            <button
              onClick={() => setOwner(owner === actor.id ? "" : actor.id)}
              aria-pressed={owner === actor.id}
              className={`inline-flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm transition ${
                owner === actor.id ? "border-gold/60 bg-gold/10 text-fg" : "border-line bg-panel text-muted hover:border-line-2 hover:text-fg"
              }`}
            >
              <Avatar member={actor} size={22} />
              My tasks
              <span className="tabular text-xs text-faint">{tasks.filter((t) => t.assigneeIds.includes(actor.id)).length}</span>
            </button>
          )}
          <label className="sr-only" htmlFor="owner-filter">
            Owner
          </label>
          <select
            id="owner-filter"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm focus:border-gold/60 focus:outline-none"
          >
            <option value="">Everyone</option>
            <option value="none">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-full border border-line bg-panel p-0.5" role="radiogroup" aria-label="View">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1 text-sm capitalize transition ${view === v ? "bg-popover text-fg ring-1 ring-line-2" : "text-muted hover:text-fg"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-black shadow-[0_8px_30px_-10px_var(--gold)] transition hover:bg-gold-2"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            New task
          </button>
        </div>
      </div>

      {loaded && (
        <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2">
          <button
            onClick={() => setShowActivity((v) => !v)}
            aria-expanded={showActivity}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.5V8l2.5 1.5" />
            </svg>
            Recent changes <span className="tabular rounded-full bg-panel-2 px-1.5 text-xs">{activity.length}</span>
            <svg viewBox="0 0 16 16" className={`size-3 transition-transform ${showActivity ? "rotate-180" : ""}`} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 6l5 5 5-5" />
            </svg>
          </button>
          {removedTasks.length > 0 && (
          <button
            onClick={() => setShowRemoved((v) => !v)}
            aria-expanded={showRemoved}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
          >
            <TrashIcon />
            Removed tasks <span className="tabular rounded-full bg-panel-2 px-1.5 text-xs">{removedTasks.length}</span>
            <svg viewBox="0 0 16 16" className={`size-3 transition-transform ${showRemoved ? "rotate-180" : ""}`} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 6l5 5 5-5" />
            </svg>
          </button>
          )}
          {showActivity && <ActivityPanel />}
          {showRemoved && removedTasks.length > 0 && <RemovedPanel />}
        </div>
      )}

      {(kind || owner || query) && loaded && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          {owner && (
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 py-0.5 pr-1 pl-1 text-fg">
              {owner === "none" ? (
                <span className="pl-2">Unassigned tasks</span>
              ) : memberById.get(owner) ? (
                <>
                  <Avatar member={memberById.get(owner)!} size={20} />
                  {memberById.get(owner)!.name}&apos;s tasks
                </>
              ) : null}
              <button onClick={() => setOwner("")} aria-label="Show everyone's tasks" className="grid size-5 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg">
                ✕
              </button>
            </span>
          )}
          Showing {filtered.length} of {tasks.length} tasks ·{" "}
          <button
            className="text-gold-ink underline-offset-2 hover:underline"
            onClick={() => {
              setKind("");
              setOwner("");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </p>
      )}

      <div className="mt-5">
        {!loaded ? (
          <div className="grid gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-panel-2" />
            ))}
          </div>
        ) : view === "board" ? (
          <Kanban tasks={filtered} />
        ) : (
          <ListView tasks={filtered} />
        )}
      </div>
    </section>
  );
}

/* ---------------- progress ---------------- */

function Progress() {
  const { loaded, tasks } = useTasks();
  const today = todayISO();
  const counts = Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length])) as Record<Status, number>;
  const total = tasks.length || 1;
  const donePct = Math.round((counts.done / total) * 100);
  const unassigned = tasks.filter((t) => t.assigneeIds.length === 0).length;
  const overdue = tasks.filter((t) => isOverdue(t, today)).length;

  return (
    <div data-reveal data-spot className="card grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
      <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-wider text-muted uppercase">Plan progress</p>
          <p className="mt-2 font-display text-5xl leading-none">
            {loaded ? donePct : "–"}
            <span className="text-2xl text-muted">%</span>
          </p>
        </div>
        <p className="tabular pb-1 text-right text-sm text-muted">
          {loaded ? `${counts.done} of ${tasks.length}` : "…"} tasks done
        </p>
      </div>

      <div className="mt-6 flex h-3 gap-[2px] overflow-hidden rounded-full bg-[rgb(var(--tint)/0.06)]" role="img" aria-label="Tasks by status">
        {loaded &&
          (["done", "in_progress", "blocked", "todo"] as Status[]).map((s) =>
            counts[s] ? (
              <div
                key={s}
                className="h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(counts[s] / total) * 100}%`, background: s === "todo" ? "rgb(var(--tint) / 0.12)" : statusColor(s) }}
                title={`${STATUS_LABEL[s]}: ${counts[s]}`}
              />
            ) : null,
          )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        {(["done", "in_progress", "blocked", "todo"] as Status[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: s === "todo" ? "rgb(var(--tint) / 0.2)" : statusColor(s) }} />
            {STATUS_LABEL[s]}
            <span className="tabular text-fg">{loaded ? counts[s] : "–"}</span>
          </li>
        ))}
      </ul>

      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["in_progress", "blocked"] as Status[]).map((s) => (
          <Stat key={s} label={STATUS_LABEL[s]} value={loaded ? counts[s] : null} icon={<span style={{ color: statusColor(s) }}><StatusIcon status={s} /></span>} />
        ))}
        <Stat label="Unassigned" value={loaded ? unassigned : null} warn={unassigned > 0} />
        <Stat label="Overdue" value={loaded ? overdue : null} warn={overdue > 0} danger />
      </div>
    </div>
  );
}

function Stat({ label, value, icon, warn, danger }: { label: string; value: number | null; icon?: ReactNode; warn?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        {icon}
        {label}
      </p>
      <p className={`tabular mt-1 font-display text-2xl ${warn ? (danger ? "text-st-blocked" : "text-gold-ink") : ""}`}>{value ?? "–"}</p>
    </div>
  );
}

/* ---------------- activity ---------------- */

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function ActivityPanel() {
  const { activity, byId, openTask } = useTasks();
  const [limit, setLimit] = useState(20);
  return (
    <div className="toast-in w-full overflow-hidden rounded-2xl border border-line bg-panel">
      <p className="flex items-center justify-between px-4 py-2.5 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">
        Recent changes
        <a href="/api/export" className="tracking-normal normal-case text-gold-ink hover:underline">
          Download full board file
        </a>
      </p>
      {activity.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-sm text-faint">No changes yet.</p>
      ) : (
        <ol className="divide-y divide-line border-t border-line">
          {activity.slice(0, limit).map((a) => {
            const t = a.taskId ? byId.get(a.taskId) : undefined;
            return (
              <li key={a.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <span className="tabular w-20 shrink-0 text-xs text-faint" title={new Date(a.at).toLocaleString("en-IN")}>
                  {timeAgo(a.at)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{a.by}</span>{" "}
                  {t ? (
                    <button onClick={() => openTask(t.id)} className="text-gold-ink hover:underline">
                      {a.subject}
                    </button>
                  ) : (
                    <span className="text-fg">{a.subject}</span>
                  )}
                  <span className="text-muted"> · {a.action}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {activity.length > limit && (
        <button onClick={() => setLimit((l) => l + 30)} className="w-full border-t border-line px-4 py-2 text-xs text-muted hover:text-fg">
          Show more
        </button>
      )}
    </div>
  );
}

/* ---------------- removed tasks ---------------- */

function RemovedPanel() {
  const { removedTasks, restore, deleteForever, notify } = useTasks();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <ul className="toast-in flex w-full flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      <li className="px-4 py-2.5 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">Removed tasks</li>
      {removedTasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-muted line-through decoration-faint">{t.title}</span>
            <span className="block truncate text-xs text-faint">
              {KIND_LABEL[t.type]} · {t.context}
            </span>
          </span>
          {confirm === t.id ? (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="text-muted">Delete for good?</span>
              <button onClick={() => setConfirm(null)} className="rounded-full px-2.5 py-1 text-muted hover:text-fg">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (await deleteForever(t.id)) notify("Task deleted permanently");
                  setConfirm(null);
                }}
                className="rounded-full bg-st-blocked px-3 py-1 font-medium text-white"
              >
                Delete forever
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <button
                onClick={async () => (await restore(t.id)) && notify("Task restored")}
                className="rounded-full border border-line-2 px-3 py-1 text-xs transition hover:border-gold/60 hover:text-gold-ink"
              >
                Restore
              </button>
              {t.type === "custom" && (
                <button onClick={() => setConfirm(t.id)} className="rounded-full px-3 py-1 text-xs text-st-blocked transition hover:bg-st-blocked/10">
                  Delete forever
                </button>
              )}
            </span>
          )}
        </li>
      ))}
      <li className="px-4 py-2.5 text-xs text-faint">
        Removed tasks keep their owner, status and notes. Plan tasks can be restored at any time; your own tasks can also be deleted for good.
      </li>
    </ul>
  );
}

/* ---------------- kanban ---------------- */

function Kanban({ tasks }: { tasks: Task[] }) {
  const { update, byId, notify } = useTasks();
  const [over, setOver] = useState<Status | null>(null);

  const onDrop = (s: Status) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/task-id");
    const t = byId.get(id);
    if (t && t.status !== s) update(id, { status: s }).then((ok) => ok && notify(`Moved to ${STATUS_LABEL[s].toLowerCase()}`));
  };

  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
      {STATUSES.map((s) => {
        const col = tasks.filter((t) => t.status === s);
        return (
          <div
            key={s}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (over !== s) setOver(s);
            }}
            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
            onDrop={onDrop(s)}
            className={`flex w-[290px] shrink-0 snap-start flex-col rounded-2xl border p-2.5 transition lg:w-auto ${
              over === s ? "border-gold/60 bg-gold/[0.06]" : "border-line bg-panel"
            }`}
          >
            <div className="flex items-center justify-between px-2 pt-1.5 pb-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span style={{ color: statusColor(s) }} className="inline-flex">
                  <StatusIcon status={s} />
                </span>
                {STATUS_LABEL[s]}
              </span>
              <span className="tabular rounded-full bg-panel-2 px-2 py-0.5 text-xs text-muted">{col.length}</span>
            </div>
            <div className="flex max-h-[640px] min-h-24 flex-col gap-2 overflow-y-auto pr-0.5">
              {col.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
              {col.length === 0 && (
                <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-faint">Drop tasks here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Edit and delete buttons shown on task cards and list rows. */
function TaskActions({ task: t }: { task: Task }) {
  const { openTask, remove } = useTasks();
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => openTask(t.id)}
        aria-label={`Edit ${t.title}`}
        title="Edit"
        className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-gold-ink"
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => remove(t.id)}
        aria-label={`Delete ${t.title}`}
        title="Delete (you can undo or restore)"
        className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-st-blocked/10 hover:text-st-blocked"
      >
        <TrashIcon />
      </button>
    </span>
  );
}

function TaskCard({ task: t }: { task: Task }) {
  const { openTask } = useTasks();
  const overdue = isOverdue(t);
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", t.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="task-card group cursor-grab rounded-xl border border-line bg-popover p-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_12px_30px_-14px_rgb(0_0_0/0.45)] active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] tracking-[0.14em] text-faint uppercase">
          {t.pillar && <span className="size-1.5 shrink-0 rounded-full" style={{ background: pillarColor(t.pillar) }} />}
          <span className="truncate">{KIND_LABEL[t.type]}</span>
        </span>
        <PriorityPill priority={t.priority} />
      </div>
      <button onClick={() => openTask(t.id)} className="mt-2 block w-full text-left">
        <span className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-gold-ink">{t.title}</span>
        {t.summary && <span className="mt-1 line-clamp-2 text-xs leading-snug text-muted">{t.summary}</span>}
        <span className="mt-1 block truncate text-[11px] text-faint">{t.context}</span>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        {t.due ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
              overdue ? "bg-st-blocked/12 font-medium text-st-blocked" : "bg-panel-2 text-muted"
            }`}
          >
            <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
              <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
            </svg>
            {overdue ? "Overdue · " : ""}
            {formatDue(t.due)}
          </span>
        ) : (
          <span className="text-[11px] text-faint">No due date</span>
        )}
        <span className="flex items-center gap-1">
          <span className="opacity-60 transition group-hover:opacity-100 focus-within:opacity-100">
            <TaskActions task={t} />
          </span>
          <OwnerChip taskId={t.id} compact />
        </span>
      </div>
      {t.notes && <p className="mt-2.5 line-clamp-2 border-t border-line pt-2 text-xs text-muted">{t.notes}</p>}
    </article>
  );
}

/* ---------------- list ---------------- */

function ListView({ tasks }: { tasks: Task[] }) {
  const { update, openTask } = useTasks();
  if (tasks.length === 0) return <p className="rounded-2xl border border-dashed border-line-2 py-12 text-center text-sm text-muted">No tasks match these filters.</p>;
  const sel = "rounded-lg border border-line bg-panel px-2 py-1.5 text-xs focus:border-gold/60 focus:outline-none";
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="text-left text-xs text-faint">
          <tr>
            <th className="border-b border-line px-5 py-3 font-medium">Task</th>
            <th className="border-b border-line px-3 py-3 font-medium">Owners</th>
            <th className="border-b border-line px-3 py-3 font-medium">Status</th>
            <th className="border-b border-line px-3 py-3 font-medium">Priority</th>
            <th className="border-b border-line px-3 py-3 font-medium">Due</th>
            <th className="border-b border-line px-5 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="transition-colors hover:bg-panel-2">
              <td className="max-w-[380px] border-b border-line px-5 py-3">
                <button onClick={() => openTask(t.id)} className="block text-left hover:text-gold-ink">
                  <span className="line-clamp-1 font-medium">{t.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {t.pillar && <span className="size-1.5 rounded-full" style={{ background: pillarColor(t.pillar) }} />}
                    {KIND_LABEL[t.type]} · <span className="truncate">{t.context}</span>
                  </span>
                </button>
              </td>
              <td className="border-b border-line px-3 py-3">
                <AssignMenu task={t} wide />
              </td>
              <td className="border-b border-line px-3 py-3">
                <select
                  aria-label={`Status of ${t.title}`}
                  value={t.status}
                  onChange={(e) => update(t.id, { status: e.target.value as Status })}
                  className={sel}
                  style={{ color: statusColor(t.status) }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border-b border-line px-3 py-3">
                <PriorityPill priority={t.priority} />
              </td>
              <td className={`border-b border-line px-5 py-3 text-xs whitespace-nowrap ${isOverdue(t) ? "font-medium text-st-blocked" : "text-muted"}`}>
                {t.due ? `${isOverdue(t) ? "Overdue · " : ""}${formatDue(t.due)}` : "—"}
              </td>
              <td className="border-b border-line px-4 py-3 text-right">
                <span className="inline-flex">
                  <TaskActions task={t} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
