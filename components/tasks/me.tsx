"use client";

import { useEffect, useRef, useState } from "react";
import { PRIORITIES, STATUS_LABEL, isOverdue, todayISO, type Member, type Task } from "@/lib/tasks";
import { useTasks } from "@/components/tasks/provider";
import { Avatar, StatusIcon, formatDue, statusColor } from "@/components/tasks/ui";

// "Who are you?" is asked once per browser. The answer only personalises the
// page; it is not a login, so anyone could type a teammate's email.
const ASKED_KEY = "cinemaip-identify-asked";
const GREETED_KEY = "cinemaip-greeted";

const store = {
  get(k: string, session = false) {
    try {
      return (session ? sessionStorage : localStorage).getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string, session = false) {
    try {
      (session ? sessionStorage : localStorage).setItem(k, v);
    } catch {}
  },
};

const firstName = (m: Member) => m.name.split(/\s+/)[0];
const RANK = Object.fromEntries(PRIORITIES.map((p, i) => [p, i]));

/** My open tasks first: overdue, then by due date, then priority; finished ones last. */
function myTasks(tasks: Task[], id: string) {
  const today = todayISO();
  return tasks
    .filter((t) => t.assigneeId === id)
    .sort(
      (a, b) =>
        Number(a.status === "done") - Number(b.status === "done") ||
        Number(isOverdue(b, today)) - Number(isOverdue(a, today)) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
        RANK[a.priority] - RANK[b.priority],
    );
}

/** Floating "you" button (bottom right), its panel, and the one-time "who are you?" prompt. */
export function MeWidget() {
  const { loaded, members, actor, tasks, notify } = useTasks();
  const [panel, setPanel] = useState(false);
  const [ask, setAsk] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Ask once, after the page has settled, if this browser hasn't said who it is.
  useEffect(() => {
    if (!loaded || actor || !members.some((m) => m.email) || store.get(ASKED_KEY)) return;
    const t = window.setTimeout(() => setAsk(true), 1200);
    return () => window.clearTimeout(t);
  }, [loaded, actor, members]);

  // Greet a known person once per visit.
  useEffect(() => {
    if (!loaded || !actor || store.get(GREETED_KEY, true)) return;
    store.set(GREETED_KEY, "1", true);
    const open = tasks.filter((t) => t.assigneeId === actor.id && t.status !== "done").length;
    notify(`Welcome back, ${firstName(actor)} · ${open ? `${open} open task${open === 1 ? "" : "s"}` : "nothing open right now"}`);
  }, [loaded, actor, tasks, notify]);

  // Close the panel on outside click or Esc.
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setPanel(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  if (!loaded) return null;
  const open = actor ? tasks.filter((t) => t.assigneeId === actor.id && t.status !== "done").length : 0;
  const late = actor ? tasks.filter((t) => t.assigneeId === actor.id && isOverdue(t)).length : 0;

  return (
    <>
      <div ref={rootRef} className="fixed right-4 bottom-4 z-[65] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
        {panel && (
          <div
            role="dialog"
            aria-label={actor ? `${actor.name}: your tasks` : "See your tasks"}
            className="toast-in max-h-[min(640px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-line-2 bg-popover/95 shadow-[var(--shadow)] backdrop-blur-xl"
          >
            {actor ? <MyPanel me={actor} onClose={() => setPanel(false)} /> : <GuestPanel onDone={() => setPanel(false)} />}
          </div>
        )}
        <button
          type="button"
          onClick={() => setPanel((v) => !v)}
          aria-expanded={panel}
          aria-label={actor ? `${actor.name}: ${open} open tasks. Open your panel` : "See your tasks"}
          title={actor ? `${actor.name} · ${open} open` : "See your tasks"}
          className={`relative grid size-14 place-items-center rounded-full border shadow-[0_14px_40px_-12px_rgb(0_0_0/0.6)] transition hover:scale-105 ${
            actor ? "border-gold/60 bg-popover p-1" : "border-line-2 bg-popover text-fg"
          } ${panel ? "ring-4 ring-gold/25" : ""}`}
        >
          {actor ? (
            <Avatar member={actor} size={46} />
          ) : (
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="12" cy="8.5" r="3.6" />
              <path d="M4.8 19.5c1.3-3.4 4-5.1 7.2-5.1s5.9 1.7 7.2 5.1" />
            </svg>
          )}
          {actor && open > 0 && (
            <span
              className={`tabular absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold text-black ring-2 ring-bg ${
                late ? "bg-st-blocked text-white" : "bg-gold"
              }`}
            >
              {open}
            </span>
          )}
          {!actor && <span className="pulse-dot absolute top-0.5 right-0.5 size-2.5 rounded-full bg-gold ring-2 ring-bg" />}
        </button>
      </div>

      <IdentifyDialog open={ask} onClose={() => setAsk(false)} />
    </>
  );
}

/* ---------------- signed-in panel ---------------- */

function MyPanel({ me, onClose }: { me: Member; onClose: () => void }) {
  const { tasks, openTask, showTasksFor, setActor } = useTasks();
  const today = todayISO();
  const mine = myTasks(tasks, me.id);
  const openList = mine.filter((t) => t.status !== "done");
  const stats = [
    { label: "Open", value: openList.length },
    { label: "Doing", value: mine.filter((t) => t.status === "in_progress").length },
    { label: "Done", value: mine.filter((t) => t.status === "done").length },
    { label: "Late", value: mine.filter((t) => isOverdue(t, today)).length, danger: true },
  ];

  return (
    <div>
      <div className="relative overflow-hidden px-5 pt-5 pb-4">
        <div aria-hidden className="absolute -top-16 -right-10 size-44 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Avatar member={me} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-[0.16em] text-gold-ink uppercase">Signed in as</p>
            <p className="truncate font-display text-lg leading-tight">{me.name}</p>
            <p className="truncate text-xs text-muted">{[me.role, me.email].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-4 gap-2 text-center">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-panel py-2">
              <p className={`tabular font-display text-lg leading-none ${s.danger && s.value ? "text-st-blocked" : s.value ? "" : "text-faint"}`}>{s.value}</p>
              <p className="mt-1 text-[10px] tracking-wider text-faint uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-2 py-2">
        <p className="px-3 pt-1 pb-2 text-[11px] font-medium tracking-[0.16em] text-muted uppercase">Assigned to you</p>
        {mine.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-faint">Nothing is assigned to you yet. Tasks will appear here once someone assigns them to you.</p>
        ) : (
          <ul className="flex flex-col">
            {mine.slice(0, 8).map((t) => {
              const late = isOverdue(t, today);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      onClose();
                      openTask(t.id);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-panel-2"
                  >
                    <span className="mt-0.5 inline-flex" style={{ color: statusColor(t.status) }} title={STATUS_LABEL[t.status]}>
                      <StatusIcon status={t.status} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`line-clamp-2 text-sm leading-snug ${t.status === "done" ? "text-muted line-through decoration-faint" : ""}`}>{t.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-faint">{t.context}</span>
                    </span>
                    {t.due && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${late ? "bg-st-blocked/12 font-medium text-st-blocked" : "bg-panel-2 text-muted"}`}>
                        {late ? "Late · " : ""}
                        {formatDue(t.due)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {mine.length > 8 && <p className="px-3 pb-1 text-xs text-faint">+{mine.length - 8} more on the board</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
        <button
          onClick={() => {
            setActor(null);
            store.set(ASKED_KEY, "1");
          }}
          className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Not you? Switch
        </button>
        <button
          onClick={() => {
            onClose();
            showTasksFor(me.id);
          }}
          disabled={!mine.length}
          className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-2 disabled:opacity-50"
        >
          My tasks on the board →
        </button>
      </div>
    </div>
  );
}

/* ---------------- guest panel & prompt ---------------- */

function GuestPanel({ onDone }: { onDone: () => void }) {
  return (
    <div className="p-5">
      <p className="text-[11px] tracking-[0.16em] text-gold-ink uppercase">Personalise this page</p>
      <p className="mt-1 font-display text-lg leading-snug">See what&apos;s assigned to you</p>
      <p className="mt-1 text-sm text-muted">Enter your company email. If you&apos;re on the CinemaIP team, your tasks appear here.</p>
      <div className="mt-4">
        <EmailForm onMatched={onDone} />
      </div>
    </div>
  );
}

function IdentifyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const skip = () => {
    store.set(ASKED_KEY, "1");
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={skip}
      onClick={(e) => e.target === ref.current && skip()}
      aria-label="Who are you?"
      className="identify m-auto w-[min(460px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line-2 bg-bg p-0 text-fg shadow-[var(--shadow)]"
    >
      <div className="relative px-7 pt-8 pb-7">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] tracking-[0.25em] text-gold-ink uppercase">Welcome to the plan</p>
          <h2 className="mt-3 font-display text-3xl leading-tight">Who&apos;s watching?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Enter your company email to see the tasks assigned to you. Or skip it and browse the plan as usual. We&apos;ll only ask once.
          </p>
          <div className="mt-6">
            <EmailForm
              autoFocus
              onMatched={() => {
                store.set(ASKED_KEY, "1");
                onClose();
              }}
            />
          </div>
          <button onClick={skip} className="mt-4 w-full rounded-full py-2 text-sm text-muted transition hover:text-fg">
            Continue without, show the normal page
          </button>
          <p className="mt-3 text-center text-[11px] text-faint">Remembered on this device only. You can change it any time from the button at the bottom right.</p>
        </div>
      </div>
    </dialog>
  );
}

/** Matches a company email against the team. */
function EmailForm({ onMatched, autoFocus = false }: { onMatched: () => void; autoFocus?: boolean }) {
  const { members, setActor, notify } = useTasks();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const domains = [...new Set(members.map((m) => m.email.split("@")[1]?.toLowerCase()).filter(Boolean))];

  const submit = () => {
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError("Enter your full email address.");
    const m = members.find((x) => x.email && x.email.toLowerCase() === v);
    if (!m) {
      const known = domains.includes(v.split("@")[1]);
      return setError(
        known
          ? "That email isn't on the CinemaIP team yet. Ask a manager to add you in the Team section."
          : `Please use your company email${domains.length ? ` (${domains.map((d) => "@" + d).join(" or ")})` : ""}.`,
      );
    }
    setActor(m.id);
    store.set(GREETED_KEY, "1", true);
    notify(`Hi ${firstName(m)}, here’s what’s assigned to you`);
    onMatched();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2.5"
    >
      <label className="sr-only" htmlFor={autoFocus ? "identify-email" : "panel-email"}>
        Company email
      </label>
      <input
        id={autoFocus ? "identify-email" : "panel-email"}
        type="email"
        autoComplete="email"
        autoFocus={autoFocus}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(null);
        }}
        placeholder={domains[0] ? `you@${domains[0]}` : "you@company.com"}
        aria-invalid={!!error}
        aria-describedby={error ? "identify-error" : undefined}
        className={`w-full rounded-xl border bg-panel px-4 py-3 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-gold/25 ${
          error ? "border-st-blocked/60" : "border-line-2 focus:border-gold/70"
        }`}
      />
      {error && (
        <p id="identify-error" role="alert" className="text-xs text-st-blocked">
          {error}
        </p>
      )}
      <button type="submit" className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-black shadow-[0_10px_30px_-10px_var(--gold)] transition hover:bg-gold-2">
        Show my tasks
      </button>
    </form>
  );
}
