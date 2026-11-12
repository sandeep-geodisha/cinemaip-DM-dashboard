"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { PRIORITY_LABEL, STATUS_LABEL, activitiesOf, activityTaskId, joinNames, type Member, type Priority, type Status, type Task } from "@/lib/tasks";
import { useTasks } from "@/components/tasks/provider";

const AVATAR_HUES = ["#b9772b", "#3f78d8", "#c4493e", "#1f927d", "#8a5fd6", "#b44f8c", "#5d7f2e"];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Colour by position in the team, so the first seven people never share one. */
function hue(id: string, order: Member[]) {
  let i = order.findIndex((m) => m.id === id);
  if (i < 0) for (const ch of id) i = (Math.max(i, 0) * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_HUES[i % AVATAR_HUES.length];
}

export function Avatar({ member, size = 28, ring = false }: { member: Member; size?: number; ring?: boolean }) {
  const { members } = useTasks();
  return (
    <span
      title={member.role ? `${member.name} · ${member.role}` : member.name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white select-none ${
        ring ? "ring-2 ring-bg" : ""
      }`}
      style={{ width: size, height: size, fontSize: size * 0.38, background: hue(member.id, members) }}
    >
      {initials(member.name)}
    </span>
  );
}

/** Overlapping avatars, with "+N" when there are more than `max`. */
export function AvatarStack({ people, size = 24, max = 3 }: { people: Member[]; size?: number; max?: number }) {
  const shown = people.length > max ? people.slice(0, max - 1) : people;
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex shrink-0 items-center" style={{ paddingLeft: size * 0.24 }}>
      {shown.map((m, i) => (
        <span
          key={m.id}
          className="relative inline-flex rounded-full ring-2 ring-[var(--ring-bg,var(--popover))]"
          style={{ marginLeft: -size * 0.24, zIndex: shown.length - i }}
        >
          <Avatar member={m} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="tabular inline-grid shrink-0 place-items-center rounded-full bg-panel-2 font-semibold text-muted ring-2 ring-[var(--ring-bg,var(--popover))]"
          style={{ width: size, height: size, fontSize: size * 0.36, marginLeft: -size * 0.24 }}
          title={people.slice(shown.length).map((m) => m.name).join(", ")}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

const firstName = (m: Member) => m.name.split(/\s+/)[0];

/** "Asha Rao", "Asha & Ravi", "3 owners": a short label for a list of owners. */
export function ownersLabel(people: Member[]) {
  if (people.length === 0) return "";
  if (people.length === 1) return people[0].name;
  if (people.length === 2) return `${firstName(people[0])} & ${firstName(people[1])}`;
  return `${people.length} owners`;
}

/** The task's owners as team members, in order. */
export function useOwners(t: Pick<Task, "assigneeIds"> | undefined) {
  const { memberById } = useTasks();
  return (t?.assigneeIds ?? []).map((id) => memberById.get(id)).filter((m): m is Member => !!m);
}

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

/**
 * Owners button with a quick pick list: tick as many people as you like.
 * Each tick adds or removes just that person, so it never undoes a change
 * someone else made at the same moment.
 */
export function AssignMenu({ task: t, wide = false }: { task: Task; wide?: boolean }) {
  const { members, update, notify, openTask } = useTasks();
  const owners = useOwners(t);
  const menuId = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Place the menu under (or above) the button each time it opens; close it if the page scrolls.
  useEffect(() => {
    const el = menu.current;
    if (!el) return;
    let above = false;
    let frame = 0;
    const place = (choose: boolean) => {
      const r = btn.current!.getBoundingClientRect();
      const w = Math.min(300, window.innerWidth - 16);
      const below = window.innerHeight - r.bottom;
      if (choose) above = below < 320 && r.top > below;
      el.style.width = `${w}px`;
      el.style.left = `${Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8)}px`;
      el.style.top = above ? "auto" : `${r.bottom + 6}px`;
      el.style.bottom = above ? `${window.innerHeight - r.top + 6}px` : "auto";
      el.style.maxHeight = `${Math.max(160, Math.min(420, (above ? r.top : below) - 16))}px`;
    };
    // Follow the button while the page scrolls; close once it's off screen.
    const onScroll = (e: Event) => {
      if (el.contains(e.target as Node)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = btn.current?.getBoundingClientRect();
        if (!r || r.bottom < 0 || r.top > window.innerHeight || (!r.width && !r.height)) el.hidePopover();
        else place(false);
      });
    };
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState !== "open") {
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
        return;
      }
      place(true);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
    };
    el.addEventListener("beforetoggle", onToggle);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("beforetoggle", onToggle);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const toggle = async (m: Member) => {
    const on = t.assigneeIds.includes(m.id);
    if (await update(t.id, on ? { removeAssignees: [m.id] } : { addAssignees: [m.id] }))
      notify(on ? `Took ${m.name} off “${short(t.title)}”` : `Added ${m.name} to “${short(t.title)}”`);
  };

  const label = owners.length ? `Owners: ${joinNames(owners.map((m) => m.name))}. Change owners` : "Unassigned. Assign owners";

  return (
    <>
      <button
        ref={btn}
        type="button"
        popoverTarget={menuId}
        aria-label={label}
        title={owners.length ? owners.map((m) => m.name).join(", ") : "Assign owners"}
        className={
          wide
            ? `inline-flex max-w-[220px] items-center gap-2 rounded-full border py-1 pr-3 text-xs transition ${
                owners.length ? "border-line bg-panel pl-1 hover:border-gold/50" : "border-dashed border-line-2 pl-3 text-muted hover:border-gold hover:text-gold-ink"
              }`
            : `grid h-6 min-w-6 shrink-0 place-items-center rounded-full transition ${
                owners.length ? "hover:scale-105" : "border border-dashed border-line-2 text-faint hover:border-gold hover:text-gold-ink"
              }`
        }
      >
        {owners.length ? <AvatarStack people={owners} size={wide ? 22 : 24} max={wide ? 3 : 3} /> : <PlusIcon />}
        {wide && <span className={`truncate ${owners.length ? "text-fg" : ""}`}>{owners.length ? ownersLabel(owners) : "Assign"}</span>}
      </button>
      <div
        ref={menu}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label={`Owners of ${t.title}`}
        className="owner-menu overflow-y-auto rounded-2xl border border-line-2 bg-popover p-1.5 text-fg shadow-[var(--shadow)]"
        style={{ "--ring-bg": "var(--popover)" } as CSSProperties}
      >
        <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2">
          <span className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">Owners</span>
          <span className="text-[11px] text-faint">{owners.length ? `${owners.length} assigned` : "Tick everyone working on it"}</span>
        </div>
        {members.length === 0 ? (
          <p className="px-2.5 pb-2 text-sm text-muted">
            No one on the team yet.{" "}
            <a href="#team" onClick={() => menu.current?.hidePopover()} className="text-gold-ink underline underline-offset-2">
              Add people
            </a>
          </p>
        ) : (
          <ul className="flex flex-col">
            {members.map((m) => {
              const on = t.assigneeIds.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    onClick={() => toggle(m)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${on ? "bg-gold/10" : "hover:bg-panel-2"}`}
                  >
                    <Avatar member={m} size={26} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate">{m.name}</span>
                      {m.role && <span className="block truncate text-[11px] text-faint">{m.role}</span>}
                    </span>
                    <span
                      aria-hidden
                      className={`grid size-[18px] shrink-0 place-items-center rounded-md border transition ${
                        on ? "border-gold bg-gold text-black" : "border-line-2 text-transparent"
                      }`}
                    >
                      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3.5 8.3l3 3 6-6.6" />
                      </svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-line px-1 pt-1.5">
          <button
            type="button"
            disabled={!owners.length}
            onClick={async () => (await update(t.id, { removeAssignees: [...t.assigneeIds] })) && notify("Unassigned")}
            className="rounded-lg px-2 py-1.5 text-xs text-muted transition hover:text-st-blocked disabled:opacity-40 disabled:hover:text-muted"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => {
              menu.current?.hidePopover();
              openTask(t.id);
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-muted transition hover:text-gold-ink"
          >
            Open task →
          </button>
        </div>
      </div>
    </>
  );
}

const short = (s: string, n = 36) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function StatusIcon({ status, className = "size-3.5" }: { status: Status; className?: string }) {
  const common = { viewBox: "0 0 16 16", className, "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  switch (status) {
    case "todo":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" strokeDasharray="2.4 2" />
        </svg>
      );
    case "in_progress":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M8 2.4a5.6 5.6 0 0 1 0 11.2Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "blocked":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M4.2 11.8l7.6-7.6" />
        </svg>
      );
    case "done":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="currentColor" stroke="none" />
          <path d="M5.2 8.2l1.9 1.9 3.8-4" stroke="var(--bg)" strokeWidth="1.8" />
        </svg>
      );
  }
}

export const statusColor = (s: Status) =>
  ({ todo: "var(--st-todo)", in_progress: "var(--st-progress)", blocked: "var(--st-blocked)", done: "var(--st-done)" })[s];

export function StatusPill({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${className}`}
      style={{
        color: statusColor(status),
        borderColor: `color-mix(in srgb, ${statusColor(status)} 40%, transparent)`,
        background: `color-mix(in srgb, ${statusColor(status)} 10%, transparent)`,
      }}
    >
      <StatusIcon status={status} className="size-3" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const bars = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted" title={`${PRIORITY_LABEL[priority]} priority`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span
            key={b}
            className="w-[3px] rounded-sm"
            style={{
              height: 4 + b * 3,
              background: b <= bars ? (priority === "high" ? "var(--gold)" : "var(--muted)") : "var(--line-2)",
            }}
          />
        ))}
      </span>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function formatDue(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Owner of a plan task, shown on the plan sections. Click to open the task.
 * `variant="status"` shows the live status instead of the owner.
 */
export function OwnerChip({ taskId, compact = false }: { taskId: string; compact?: boolean }) {
  const { loaded, byId, openTask, removedIds, restore, notify } = useTasks();
  const t = byId.get(taskId);
  if (loaded && removedIds.has(taskId)) {
    return (
      <button
        type="button"
        onClick={async () => (await restore(taskId)) && notify("Task restored to the board")}
        title="This task was removed from the board. Click to restore it."
        className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-2 text-xs text-faint transition hover:border-gold hover:text-gold-ink ${
          compact ? "size-6 justify-center" : "px-3 py-1"
        }`}
        aria-label="Removed from the board. Restore task"
      >
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5v2.5h2.5" />
        </svg>
        {!compact && "Removed · Restore"}
      </button>
    );
  }
  if (!loaded || !t) return <span className={`inline-block animate-pulse rounded-full bg-panel-2 ${compact ? "size-6" : "h-7 w-24"}`} />;
  if (compact) return <AssignMenu task={t} />;
  return <OwnerButton task={t} onClick={() => openTask(taskId)} />;
}

function OwnerButton({ task: t, onClick }: { task: Task; onClick: () => void }) {
  const owners = useOwners(t);
  const m = owners.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      title={m ? `${owners.map((o) => o.name).join(", ")} · ${STATUS_LABEL[t.status]}` : "Assign owners"}
      className={`group/owner inline-flex max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs transition ${
        m ? "border-line bg-panel hover:border-gold/50" : "border-dashed border-line-2 pl-3 text-muted hover:border-gold hover:text-gold-ink"
      }`}
      style={{ "--ring-bg": "var(--panel)" } as CSSProperties}
    >
      {m ? (
        <>
          <AvatarStack people={owners} size={22} />
          <span className="truncate text-fg">{ownersLabel(owners)}</span>
          <span style={{ color: statusColor(t.status) }} className="inline-flex" title={STATUS_LABEL[t.status]}>
            <StatusIcon status={t.status} className="size-3" />
          </span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Assign owners
        </>
      )}
    </button>
  );
}

/** The calendar tasks behind one initiative, each with its status and owners. */
export function InitiativeTasks({ initiativeId }: { initiativeId: number }) {
  const { byId, openTask, removedIds } = useTasks();
  return (
    <ul className="flex flex-col gap-1.5">
      {activitiesOf(initiativeId).map(({ phase, a }) => {
        const id = activityTaskId(phase.phase, initiativeId, a.key);
        const t = byId.get(id);
        const status = t?.status ?? "todo";
        const gone = removedIds.has(id);
        return (
          <li key={id} className="flex items-center gap-2.5 rounded-xl border border-line bg-[rgb(var(--tint)/0.025)] py-2 pr-2 pl-3">
            <span className="inline-flex shrink-0" style={{ color: statusColor(status) }} title={STATUS_LABEL[status]}>
              <StatusIcon status={status} />
            </span>
            <button
              type="button"
              disabled={!t}
              onClick={() => openTask(id)}
              className="group/task min-w-0 flex-1 text-left disabled:cursor-default"
            >
              <span className="block text-[10px] tracking-[0.14em] text-faint uppercase">
                Act {["I", "II", "III"][phase.phase - 1]} · {phase.period}
              </span>
              <span className={`line-clamp-2 text-[13px] leading-snug transition group-enabled/task:group-hover/task:text-gold-ink ${gone ? "text-faint line-through" : ""}`}>
                {t?.title ?? a.activity}
              </span>
            </button>
            <OwnerChip taskId={id} compact />
          </li>
        );
      })}
    </ul>
  );
}

/** Live status pill for a plan task (falls back to "To do" while loading). */
export function LiveStatus({ taskId }: { taskId: string }) {
  const { byId, removedIds } = useTasks();
  if (removedIds.has(taskId))
    return <span className="rounded-full border border-dashed border-line-2 px-2.5 py-0.5 text-[11px] text-faint">Not on board</span>;
  return <StatusPill status={byId.get(taskId)?.status ?? "todo"} />;
}

/**
 * Renders a task description. Plain text, with two conventions:
 * "Label: text" lines get a bold label, and "- item" lines become bullets.
 */
export function DescriptionView({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: number) => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${key}`} className="ml-4 list-disc space-y-1 marker:text-gold/70">
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return flush(i);
    if (/^[-•*]\s+/.test(line)) {
      list.push(line.replace(/^[-•*]\s+/, ""));
      return;
    }
    flush(i);
    const m = line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (m && !/^https?$/i.test(m[1]))
      blocks.push(
        m[2] ? (
          <p key={i}>
            <span className="font-medium text-fg">{m[1]}:</span> {m[2]}
          </p>
        ) : (
          <p key={i} className="pt-1 font-medium text-fg">
            {m[1]}
          </p>
        ),
      );
    else blocks.push(<p key={i}>{line}</p>);
  });
  flush(-1);
  return <div className="space-y-2 text-sm leading-relaxed text-muted">{blocks}</div>;
}
