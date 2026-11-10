"use client";

import { PRIORITY_LABEL, STATUS_LABEL, type Member, type Priority, type Status } from "@/lib/tasks";
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
  const { loaded, byId, memberById, openTask, removedIds, restore, notify } = useTasks();
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
  const m = t.assigneeId ? memberById.get(t.assigneeId) : undefined;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openTask(taskId)}
        aria-label={m ? `Assigned to ${m.name}. Edit task` : "Unassigned. Assign this task"}
        title={m ? `${m.name} · ${STATUS_LABEL[t.status]}` : "Assign"}
        className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-line-2 text-faint transition hover:border-gold hover:text-gold-ink"
        style={m ? { border: "none" } : undefined}
      >
        {m ? (
          <Avatar member={m} size={24} />
        ) : (
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 3v10M3 8h10" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openTask(taskId)}
      className={`group/owner inline-flex max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs transition ${
        m ? "border-line bg-panel hover:border-gold/50" : "border-dashed border-line-2 pl-3 text-muted hover:border-gold hover:text-gold-ink"
      }`}
    >
      {m ? (
        <>
          <Avatar member={m} size={22} />
          <span className="truncate text-fg">{m.name}</span>
          <span style={{ color: statusColor(t.status) }} className="inline-flex" title={STATUS_LABEL[t.status]}>
            <StatusIcon status={t.status} className="size-3" />
          </span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Assign owner
        </>
      )}
    </button>
  );
}

/** Live status pill for a plan task (falls back to "To do" while loading). */
export function LiveStatus({ taskId }: { taskId: string }) {
  const { byId, removedIds } = useTasks();
  if (removedIds.has(taskId))
    return <span className="rounded-full border border-dashed border-line-2 px-2.5 py-0.5 text-[11px] text-faint">Not on board</span>;
  return <StatusPill status={byId.get(taskId)?.status ?? "todo"} />;
}
