"use client";

import { useRef, useState, type ReactNode } from "react";
import { LIMITS, isOverdue, todayISO, type Member, type Task } from "@/lib/tasks";
import { SectionHead } from "@/components/section-head";
import { useTasks, type ImportResult } from "@/components/tasks/provider";
import { Avatar } from "@/components/tasks/ui";
import { PencilIcon, TrashIcon } from "@/components/tasks/editor";

const field =
  "w-full min-w-0 rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm placeholder:text-faint focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20";

type Load = { total: number; open: number; inProgress: number; done: number; blocked: number; overdue: number; shared: number; solo: number };

function loadFor(tasks: Task[], id: string, today: string): Load {
  const mine = tasks.filter((t) => t.assigneeIds.includes(id));
  return {
    shared: mine.filter((t) => t.assigneeIds.length > 1).length,
    solo: mine.filter((t) => t.assigneeIds.length === 1).length,
    total: mine.length,
    open: mine.filter((t) => t.status !== "done").length,
    inProgress: mine.filter((t) => t.status === "in_progress").length,
    done: mine.filter((t) => t.status === "done").length,
    blocked: mine.filter((t) => t.status === "blocked").length,
    overdue: mine.filter((t) => isOverdue(t, today)).length,
  };
}

/** The crew: everyone who owns part of the plan, with their workload. */
export function TeamSection() {
  const { loaded, members, tasks, actor, setActor, importMembers, notify, showTasksFor } = useTasks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importReport, setImportReport] = useState<ImportResult | null>(null);
  const [adding, setAdding] = useState(false);
  const today = todayISO();
  const assigned = tasks.filter((t) => t.assigneeIds.length > 0).length;
  const unassigned = tasks.length - assigned;

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

  return (
    <section id="team" className="scroll-mt-24">
      <SectionHead
        n="02"
        kicker="The crew"
        title={
          <>
            The people <em className="gold-text not-italic">behind</em> the plan
          </>
        }
        lede="Everyone who owns a part of the plan, and how much is on their plate. Add people here, then assign them tasks on the board below."
      />

      {/* Toolbar */}
      <div data-reveal className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <Figure value={loaded ? members.length : null} label={members.length === 1 ? "person" : "people"} />
          <Figure value={loaded ? assigned : null} label={`of ${tasks.length} tasks assigned`} />
          {loaded && unassigned > 0 && (
            <button onClick={() => showTasksFor("none")} className="text-gold-ink underline-offset-2 hover:underline">
              {unassigned} unassigned · show them
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loaded && members.length > 0 && (
            <label className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-panel py-1 pr-2 pl-3.5 text-xs text-muted">
              <span className="shrink-0">You are</span>
              <select
                value={actor?.id ?? ""}
                onChange={(e) => setActor(e.target.value || null)}
                className="max-w-52 min-w-0 bg-transparent py-1 text-sm text-fg focus:outline-none"
              >
                <option value="">Choose your name</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {actor && <Avatar member={actor} size={22} />}
            </label>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title='Add people from a JSON file: [{"name": "...", "role": "...", "email": "..."}]'
            className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm text-muted transition hover:border-gold/60 hover:text-fg"
          >
            Import JSON
          </button>
          <a
            href="/api/export"
            title="Download the whole board: team, tasks and history"
            className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm text-muted transition hover:border-gold/60 hover:text-fg"
          >
            Export
          </a>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-black shadow-[0_8px_30px_-10px_var(--gold)] transition hover:bg-gold-2"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add person
          </button>
        </div>
      </div>

      {loaded && members.length > 0 && !actor && (
        <p className="mt-3 text-xs text-faint">Tip: choose your name under “You are” so the history shows who made each change.</p>
      )}

      {importReport && (
        <div className="toast-in mt-4 rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>
              Import: <b className="font-medium">{importReport.added}</b> added · <b className="font-medium">{importReport.updated}</b> updated ·{" "}
              <b className="font-medium">{importReport.skipped.length}</b> skipped
            </span>
            <button onClick={() => setImportReport(null)} className="text-muted hover:text-fg" aria-label="Dismiss">
              ✕
            </button>
          </div>
          {importReport.skipped.length > 0 && (
            <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-y-auto text-xs text-muted">
              {importReport.skipped.map((s, i) => (
                <li key={i}>
                  {s.entry}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!loaded &&
          [0, 1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-[20px] bg-panel-2" />)}
        {members.map((m, i) => (
          <MemberCard key={m.id} member={m} load={loadFor(tasks, m.id, today)} isYou={actor?.id === m.id} delay={(i % 4) * 70} />
        ))}
        {loaded &&
          (adding ? (
            <AddCard onDone={() => setAdding(false)} />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="group flex min-h-64 flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-line-2 p-6 text-sm text-muted transition hover:border-gold/60 hover:text-fg"
            >
              <span className="grid size-14 place-items-center rounded-full border border-dashed border-line-2 text-2xl transition group-hover:border-gold/60 group-hover:text-gold-ink">
                +
              </span>
              {members.length ? "Add a person" : "Add the first person, or import a JSON list"}
            </button>
          ))}
      </div>
    </section>
  );
}

function Figure({ value, label }: { value: number | null; label: string }) {
  return (
    <span>
      <b className="tabular font-display text-xl font-semibold text-fg">{value ?? "–"}</b> {label}
    </span>
  );
}

/* ---------------- member card ---------------- */

function MemberCard({ member: m, load, isYou, delay }: { member: Member; load: Load; isYou: boolean; delay: number }) {
  const { updateMember, removeMember, notify, showTasksFor } = useTasks();
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [name, setName] = useState(m.name);
  const [role, setRole] = useState(m.role);
  const [email, setEmail] = useState(m.email);
  const [busy, setBusy] = useState(false);
  const donePct = load.total ? Math.round((load.done / load.total) * 100) : 0;

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
    if (ok) notify(`${m.name} removed${load.total ? `. ${afterRemoval(load)}` : ""}`);
    else setMode("view");
  };

  if (mode === "edit") {
    return (
      <Shell delay={delay} className="border-gold/50 bg-gold/[0.05]">
        <form
          className="flex h-full flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setMode("view"))}
        >
          <div className="mb-1 flex items-center gap-3">
            <Avatar member={{ ...m, name: name || m.name }} size={40} />
            <span className="text-xs tracking-[0.16em] text-gold-ink uppercase">Edit person</span>
          </div>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={LIMITS.name} required className={field} />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" aria-label="Role" maxLength={LIMITS.role} className={field} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" maxLength={LIMITS.email} className={field} />
          <div className="mt-auto flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setMode("view")} className="rounded-full px-3.5 py-1.5 text-sm text-muted hover:text-fg">
              Cancel
            </button>
            <button type="submit" disabled={busy || !name.trim()} className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-2 disabled:opacity-50">
              Save
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  if (mode === "confirm") {
    return (
      <Shell delay={delay} className="border-st-blocked/50 bg-st-blocked/[0.06]">
        <div className="flex h-full flex-col">
          <Avatar member={m} size={48} />
          <p className="mt-4 font-display text-xl">Remove {m.name}?</p>
          <p className="mt-1.5 text-sm text-muted">
            {load.total ? `They'll be taken off ${plural(load.total)}. ${load.solo ? `${plural(load.solo, true)} only them, so ${load.solo === 1 ? "it" : "they"} will become unassigned.` : "Every one of them has other owners too."}` : "They have no tasks assigned."}{" "}
            A backup is kept before removing.
          </p>
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <button onClick={() => setMode("view")} className="rounded-full px-3.5 py-1.5 text-sm text-muted hover:text-fg">
              Keep
            </button>
            <button onClick={remove} disabled={busy} className="rounded-full bg-st-blocked px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60">
              Remove
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell delay={delay} className={isYou ? "border-gold/40" : ""}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <Avatar member={m} size={52} />
          <span className="-mt-1 -mr-1 flex items-center gap-0.5 opacity-60 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={startEdit}
              aria-label={`Edit ${m.name}`}
              title="Edit"
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-gold-ink"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => setMode("confirm")}
              aria-label={`Remove ${m.name}`}
              title="Remove"
              className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-st-blocked/10 hover:text-st-blocked"
            >
              <TrashIcon />
            </button>
          </span>
        </div>

        <h3 className="mt-4 flex items-center gap-2 font-display text-xl leading-snug">
          <span className="min-w-0 break-words">{m.name}</span>
          {isYou && <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 font-sans text-[10px] font-medium tracking-wider text-gold-ink uppercase">You</span>}
        </h3>
        <p className="mt-0.5 text-sm text-muted">{m.role || <span className="text-faint">No role set</span>}</p>
        {m.email ? (
          <a href={`mailto:${m.email}`} className="mt-1 truncate text-xs text-faint transition hover:text-gold-ink" title={m.email}>
            {m.email}
          </a>
        ) : (
          <span className="mt-1 text-xs text-faint">No email</span>
        )}

        <div className="mt-5 grid grid-cols-4 gap-1.5 border-t border-line pt-4 text-center">
          <Mini value={load.open} label="Open" />
          <Mini value={load.inProgress} label="Doing" />
          <Mini value={load.done} label="Done" />
          <Mini value={load.overdue} label="Late" tone={load.overdue ? "danger" : undefined} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span>
              {load.total ? `${load.done} of ${load.total} done` : "No tasks yet"}
              {load.shared > 0 && <span title="Tasks this person shares with other owners"> · {load.shared} shared</span>}
            </span>
            {load.blocked > 0 && <span className="text-st-blocked">{load.blocked} blocked</span>}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--tint)/0.07)]">
            <div className="h-full rounded-full bg-st-done transition-[width] duration-700" style={{ width: `${donePct}%` }} />
          </div>
        </div>

        <button
          onClick={() => showTasksFor(m.id)}
          disabled={!load.total}
          className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-line-2 px-4 py-2 text-sm transition enabled:hover:border-gold/60 enabled:hover:text-gold-ink disabled:text-faint"
        >
          {load.total ? `View ${load.total} task${load.total === 1 ? "" : "s"}` : "No tasks assigned"}
          {load.total > 0 && <span aria-hidden>→</span>}
        </button>
      </div>
    </Shell>
  );
}

const plural = (n: number, has = false) => `${n} task${n === 1 ? "" : "s"}${has ? (n === 1 ? " has" : " have") : ""}`;
const afterRemoval = (l: Load) =>
  l.solo ? `${plural(l.solo, true)} no owner now.` : `Their ${plural(l.total)} still ${l.total === 1 ? "has" : "have"} other owners.`;

function Mini({ value, label, tone }: { value: number; label: string; tone?: "danger" }) {
  return (
    <div>
      <p className={`tabular font-display text-lg leading-none ${tone === "danger" ? "text-st-blocked" : value ? "text-fg" : "text-faint"}`}>{value}</p>
      <p className="mt-1 text-[10px] tracking-wider text-faint uppercase">{label}</p>
    </div>
  );
}

function Shell({ children, delay, className = "" }: { children: ReactNode; delay: number; className?: string }) {
  return (
    <article data-reveal data-spot className={`card group flex min-h-64 flex-col p-6 ${className}`} style={{ ["--d" as string]: `${delay}ms` }}>
      {children}
    </article>
  );
}

/* ---------------- add card ---------------- */

function AddCard({ onDone }: { onDone: () => void }) {
  const { addMember, notify } = useTasks();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (again: boolean) => {
    if (!name.trim()) return;
    setBusy(true);
    const m = await addMember({ name, role, email });
    setBusy(false);
    if (!m) return;
    notify(`${m.name} added to the team`);
    setName("");
    setRole("");
    setEmail("");
    if (!again) onDone();
  };

  return (
    <article className="card toast-in flex min-h-64 flex-col border-gold/50 bg-gold/[0.05] p-6">
      <form
        className="flex h-full flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          add(false);
        }}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
      >
        <span className="mb-1 text-xs tracking-[0.16em] text-gold-ink uppercase">New person</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={LIMITS.name} required className={field} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, e.g. Social Media" aria-label="Role" maxLength={LIMITS.role} className={field} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" maxLength={LIMITS.email} className={field} />
        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={onDone} className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-fg">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => add(true)}
            disabled={busy || !name.trim()}
            className="rounded-full border border-line-2 px-3.5 py-1.5 text-sm transition hover:border-gold/60 disabled:opacity-50"
          >
            Add & another
          </button>
          <button type="submit" disabled={busy || !name.trim()} className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-2 disabled:opacity-50">
            Add
          </button>
        </div>
      </form>
    </article>
  );
}
