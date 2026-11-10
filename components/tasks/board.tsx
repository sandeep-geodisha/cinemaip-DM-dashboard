"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { pillarColor } from "@/lib/plan";
import {
  KINDS,
  KIND_LABEL,
  KIND_PLURAL,
  LIMITS,
  PRIORITIES,
  STATUSES,
  STATUS_LABEL,
  isOverdue,
  todayISO,
  type Kind,
  type Member,
  type Status,
  type Task,
} from "@/lib/tasks";
import { SectionHead } from "@/components/section-head";
import { useTasks, type ImportResult } from "@/components/tasks/provider";
import { Avatar, OwnerChip, PriorityPill, StatusIcon, formatDue, statusColor } from "@/components/tasks/ui";
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
  const { loaded, tasks, members, openNew, removedTasks, fileError, activity } = useTasks();
  const [showRemoved, setShowRemoved] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [kind, setKind] = useState<Kind | "">("");
  const [owner, setOwner] = useState<string>(""); // "" all, "none" unassigned, or member id
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "list">("board");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTasks(
      tasks.filter(
        (t) =>
          (!kind || t.type === kind) &&
          (!owner || (owner === "none" ? !t.assigneeId : t.assigneeId === owner)) &&
          (!q || `${t.title} ${t.summary} ${t.description} ${t.context} ${t.notes} ${t.assignee ?? ""}`.toLowerCase().includes(q)),
      ),
    );
  }, [tasks, kind, owner, query]);

  return (
    <section id="board" className="scroll-mt-24">
      <SectionHead
        n="02"
        kicker="Task board"
        title={
          <>
            Who is doing <em className="gold-text not-italic">what</em>, and by when
          </>
        }
        lede="Every decision, calendar activity and initiative is a task with a full brief. Give each one an owner, a due date and a status. Every change is saved to the board file straight away, so the whole team sees the same board."
      />

      {fileError && (
        <div role="alert" className="mt-10 rounded-2xl border border-st-blocked/50 bg-st-blocked/[0.08] px-5 py-4 text-sm">
          <p className="font-medium text-st-blocked">The board file can&apos;t be read, so changes are paused</p>
          <p className="mt-1 text-muted">
            {fileError} You&apos;re seeing the last saved version. Fix <code className="font-mono">data/tasks.json</code>, or copy a good version
            back from <code className="font-mono">data/backups/</code>; the board picks it up within a few seconds.
          </p>
        </div>
      )}

      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Progress />
        <Team owner={owner} onPick={(id) => setOwner(owner === id ? "" : id)} />
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
        <p className="mt-3 text-sm text-muted">
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
  const unassigned = tasks.filter((t) => !t.assigneeId).length;
  const overdue = tasks.filter((t) => isOverdue(t, today)).length;

  return (
    <div data-reveal data-spot className="card p-6 sm:p-7">
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

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

/* ---------------- team ---------------- */

function Team({ owner, onPick }: { owner: string; onPick: (id: string) => void }) {
  const { loaded, members, tasks, addMember, notify, actor, setActor, importMembers } = useTasks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importReport, setImportReport] = useState<ImportResult | null>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      notify(`${file.name} isn't valid JSON`, "error");
      return;
    }
    const r = await importMembers(json);
    if (r) {
      setImportReport(r);
      notify(`Imported ${file.name}: ${r.added} added, ${r.updated} updated, ${r.skipped.length} skipped`);
    }
  };
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const m = await addMember({ name, role, email });
    setBusy(false);
    if (m) {
      notify(`${m.name} added to the team`);
      setName("");
      setRole("");
      setEmail("");
    }
  };

  const load = (m: Member) => {
    const mine = tasks.filter((t) => t.assigneeId === m.id);
    return { open: mine.filter((t) => t.status !== "done").length, done: mine.filter((t) => t.status === "done").length };
  };

  const field =
    "min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-sm placeholder:text-faint focus:border-gold/60 focus:outline-none";

  return (
    <div data-reveal data-spot className="card flex flex-col p-6 sm:p-7" style={{ ["--d" as string]: "120ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">
          Team <span className="tabular ml-1 text-xs font-normal text-muted">{loaded ? members.length : "…"}</span>
        </h3>
        <div className="flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} />
          <button
            onClick={() => fileRef.current?.click()}
            title='Add people from a JSON file: [{"name": "...", "role": "...", "email": "..."}]'
            className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-gold/60 hover:text-fg"
          >
            Import JSON
          </button>
          <a
            href="/api/export"
            title="Download the whole board file: team, tasks and history"
            className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-gold/60 hover:text-fg"
          >
            Export
          </a>
        </div>
      </div>

      {loaded && members.length > 0 && (
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-xs text-muted">
          <span className="shrink-0">You are</span>
          <select
            value={actor?.id ?? ""}
            onChange={(e) => setActor(e.target.value || null)}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg focus:outline-none"
          >
            <option value="">Choose your name, so changes show who made them</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {actor && <Avatar member={actor} size={22} />}
        </label>
      )}

      {importReport && (
        <div className="toast-in mt-3 rounded-xl border border-line bg-panel px-3.5 py-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-fg">
              Import: {importReport.added} added · {importReport.updated} updated · {importReport.skipped.length} skipped
            </span>
            <button onClick={() => setImportReport(null)} className="text-muted hover:text-fg" aria-label="Dismiss">
              ✕
            </button>
          </div>
          {importReport.skipped.length > 0 && (
            <ul className="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto text-muted">
              {importReport.skipped.map((s, i) => (
                <li key={i}>
                  {s.entry}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ul className="mt-4 flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
        {loaded && members.length === 0 && (
          <li className="rounded-xl border border-dashed border-line-2 px-4 py-5 text-center text-sm text-muted">
            Add the people who will own this plan, or import them from a JSON file. You can then assign any task to them.
          </li>
        )}
        {members.map((m) => (
          <MemberRow key={m.id} member={m} load={load(m)} selected={owner === m.id} onPick={() => onPick(m.id)} />
        ))}
      </ul>

      <form
        className="mt-auto grid grid-cols-2 gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={LIMITS.name} aria-label="Name" className={field} required />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" maxLength={LIMITS.role} aria-label="Role" className={field} />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          maxLength={LIMITS.email}
          aria-label="Email"
          className={field}
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black transition hover:bg-gold-2 disabled:bg-panel-2 disabled:text-faint"
        >
          Add to team
        </button>
      </form>
    </div>
  );
}

const memberField =
  "min-w-0 rounded-lg border border-line bg-panel px-3 py-2 text-sm placeholder:text-faint focus:border-gold/60 focus:outline-none";

/** One team member: view, inline edit, or confirm removal. */
function MemberRow({
  member: m,
  load,
  selected,
  onPick,
}: {
  member: Member;
  load: { open: number; done: number };
  selected: boolean;
  onPick: () => void;
}) {
  const { updateMember, removeMember, notify } = useTasks();
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [name, setName] = useState(m.name);
  const [role, setRole] = useState(m.role);
  const [email, setEmail] = useState(m.email);
  const [busy, setBusy] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  const assigned = load.open + load.done;

  // Keep the edit form and confirm prompt fully visible inside the scrolling list.
  useEffect(() => {
    if (mode !== "view") rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [mode]);

  const startEdit = () => {
    setName(m.name);
    setRole(m.role);
    setEmail(m.email);
    setMode("edit");
  };

  const save = async () => {
    if (!name.trim()) return;
    const patch: { name?: string; role?: string; email?: string } = {};
    if (name.trim() !== m.name) patch.name = name;
    if (role.trim() !== m.role) patch.role = role;
    if (email.trim() !== m.email) patch.email = email;
    if (!Object.keys(patch).length) return setMode("view");
    setBusy(true);
    const ok = await updateMember(m.id, patch);
    setBusy(false);
    if (ok) {
      notify(`${name.trim()} updated`);
      setMode("view");
    }
  };

  const remove = async () => {
    setBusy(true);
    const ok = await removeMember(m.id);
    setBusy(false);
    if (ok) notify(assigned ? `${m.name} removed. Their ${assigned} task${assigned === 1 ? " is" : "s are"} now unassigned.` : `${m.name} removed`);
    else setMode("view");
  };

  if (mode === "edit") {
    return (
      <li ref={rowRef} className="rounded-xl border border-gold/40 bg-gold/[0.06] p-3">
        <form
          className="grid grid-cols-2 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setMode("view"))}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={LIMITS.name} required className={memberField} />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" aria-label="Role" maxLength={LIMITS.role} className={memberField} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" maxLength={LIMITS.email} className={`${memberField} col-span-2`} />
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setMode("view")} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg">
              Cancel
            </button>
            <button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-2 disabled:opacity-50">
              Save
            </button>
          </div>
        </form>
      </li>
    );
  }

  if (mode === "confirm") {
    return (
      <li ref={rowRef} className="flex flex-wrap items-center gap-3 rounded-xl border border-st-blocked/40 bg-st-blocked/[0.07] px-3 py-2.5">
        <Avatar member={m} size={32} />
        <p className="min-w-0 flex-1 text-sm">
          Remove <span className="font-medium">{m.name}</span>?
          <span className="block text-xs text-muted">
            {assigned ? `Their ${assigned} task${assigned === 1 ? "" : "s"} will become unassigned.` : "They have no tasks assigned."}
          </span>
        </p>
        <span className="flex shrink-0 items-center gap-1.5">
          <button onClick={() => setMode("view")} className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-fg">
            Keep
          </button>
          <button onClick={remove} disabled={busy} className="rounded-full bg-st-blocked px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60">
            Remove
          </button>
        </span>
      </li>
    );
  }

  return (
    <li className={`group flex items-center gap-2 rounded-xl px-2 py-1.5 transition ${selected ? "bg-gold/10 ring-1 ring-gold/40" : "hover:bg-panel-2"}`}>
      <button onClick={onPick} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={selected} title={`Show ${m.name}'s tasks`}>
        <Avatar member={m} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{m.name}</span>
          <span className="block truncate text-xs text-faint">{[m.role, m.email].filter(Boolean).join(" · ") || "No role set"}</span>
        </span>
        <span className="tabular shrink-0 text-right text-xs text-muted">
          {load.open} open
          {load.done > 0 && <span className="block text-faint">{load.done} done</span>}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={startEdit}
          aria-label={`Edit ${m.name}`}
          title="Edit"
          className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-gold-ink"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M10.8 2.7l2.5 2.5L5.6 12.9 2.5 13.5l.6-3.1z" />
            <path d="M9.4 4.1l2.5 2.5" />
          </svg>
        </button>
        <button
          onClick={() => setMode("confirm")}
          aria-label={`Remove ${m.name}`}
          title="Remove"
          className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-st-blocked/10 hover:text-st-blocked"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 9h6.6l.7-9M6.8 7v4M9.2 7v4" />
          </svg>
        </button>
      </span>
    </li>
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
  const { members, update, openTask, notify, memberById } = useTasks();
  if (tasks.length === 0) return <p className="rounded-2xl border border-dashed border-line-2 py-12 text-center text-sm text-muted">No tasks match these filters.</p>;
  const sel = "rounded-lg border border-line bg-panel px-2 py-1.5 text-xs focus:border-gold/60 focus:outline-none";
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="text-left text-xs text-faint">
          <tr>
            <th className="border-b border-line px-5 py-3 font-medium">Task</th>
            <th className="border-b border-line px-3 py-3 font-medium">Owner</th>
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
                <select
                  aria-label={`Owner of ${t.title}`}
                  value={t.assigneeId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    update(t.id, { assigneeId: id }).then((ok) => ok && notify(id ? `Assigned to ${memberById.get(id)?.name}` : "Unassigned"));
                  }}
                  className={`${sel} max-w-[160px]`}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
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
