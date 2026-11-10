"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PILLARS, pillarColor } from "@/lib/plan";
import {
  KIND_LABEL,
  LIMITS,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  formatDate,
  isEdited,
  isOverdue,
  planTextById,
  type Priority,
  type Status,
  type Task,
} from "@/lib/tasks";
import { useTasks, type Patch } from "@/components/tasks/provider";
import { Avatar, DescriptionView, StatusIcon, statusColor } from "@/components/tasks/ui";

type Editing = { mode: "edit"; id: string } | { mode: "new" } | null;

/** Right-hand drawer for editing or creating a task. Native <dialog> gives focus trapping and Esc. */
export function TaskEditor({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { byId } = useTasks();
  const task = editing?.mode === "edit" ? byId.get(editing.id) : undefined;
  const open = editing?.mode === "new" || !!task;

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={task ? `Task: ${task.title}` : "New task"}
      className="drawer m-0 ml-auto h-dvh max-h-none w-[min(540px,100vw)] max-w-none border-l border-line-2 bg-bg p-0 text-fg shadow-[var(--shadow)]"
    >
      {editing?.mode === "new" && <NewTaskForm onDone={onClose} />}
      {task && <EditTask key={task.id} task={task} onClose={onClose} />}
    </dialog>
  );
}

/* ---------------- shared bits ---------------- */

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase">{label}</span>
        {hint}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line-2 bg-panel px-3.5 py-2.5 text-sm text-fg placeholder:text-faint transition focus:border-gold/70 focus:outline-none focus:ring-2 focus:ring-gold/20";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  render,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  render: (v: T, on: boolean) => ReactNode;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-1.5 rounded-xl border border-line bg-panel p-1 ${options.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
              on ? "bg-popover text-fg shadow-[0_1px_2px_rgb(0_0_0/0.15)] ring-1 ring-line-2" : "text-muted hover:text-fg"
            }`}
          >
            {render(o, on)}
          </button>
        );
      })}
    </div>
  );
}

function StatusOption(s: Status) {
  return (
    <>
      <span style={{ color: statusColor(s) }} className="inline-flex">
        <StatusIcon status={s} className="size-3.5" />
      </span>
      <span className="truncate">{STATUS_LABEL[s]}</span>
    </>
  );
}

function OwnerPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { members, addMember } = useTasks();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const m = await addMember({ name, role });
    setBusy(false);
    if (m) {
      onChange(m.id);
      setName("");
      setRole("");
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <OwnerOption on={value === null} onClick={() => onChange(null)}>
          <span className="grid size-6 place-items-center rounded-full border border-dashed border-line-2 text-faint">–</span>
          Unassigned
        </OwnerOption>
        {members.map((m) => (
          <OwnerOption key={m.id} on={value === m.id} onClick={() => onChange(m.id)}>
            <Avatar member={m} size={24} />
            <span className="flex flex-col items-start leading-tight">
              <span>{m.name}</span>
              {m.role && <span className="text-[10px] text-faint">{m.role}</span>}
            </span>
          </OwnerOption>
        ))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-2 px-3 py-1.5 text-xs text-muted transition hover:border-gold hover:text-gold-ink"
          >
            + Add person
          </button>
        )}
      </div>
      {members.length === 0 && !adding && (
        <p className="text-xs text-faint">No one on the team yet. Add a person to assign this task.</p>
      )}
      {adding && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3 sm:flex-row">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="Name"
            maxLength={LIMITS.name}
            className={inputCls}
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="Role (optional)"
            maxLength={LIMITS.role}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={busy || !name.trim()}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-medium whitespace-nowrap text-black transition hover:bg-gold-2 disabled:opacity-50"
            >
              Add & assign
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-xl px-3 py-2 text-sm text-muted hover:text-fg">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerOption({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-xs transition ${
        on ? "border-gold/70 bg-gold/10 text-fg shadow-[0_0_24px_-10px_var(--gold)]" : "border-line bg-panel text-muted hover:border-line-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function DueInput({ value, onChange, status }: { value: string | null; onChange: (v: string | null) => void; status: Status }) {
  const overdue = isOverdue({ due: value, status });
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`${inputCls} max-w-[220px] ${overdue ? "border-st-blocked/60" : ""}`}
      />
      {value && (
        <button type="button" onClick={() => onChange(null)} className="text-xs text-muted hover:text-fg">
          Clear
        </button>
      )}
      {overdue && <span className="text-xs font-medium text-st-blocked">Overdue</span>}
    </div>
  );
}

function DrawerHeader({ kicker, children, onClose }: { kicker: ReactNode; children: ReactNode; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 border-b border-line bg-bg/90 px-6 pt-6 pb-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.14em] text-muted uppercase">{kicker}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-panel-2 hover:text-fg"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

/* ---------------- edit ---------------- */

/** Keeps a local draft of a text field, following remote changes unless the user is mid-edit. */
function useDraft(remote: string) {
  const [value, setValue] = useState(remote);
  const [dirty, setDirty] = useState(false);
  const [seen, setSeen] = useState(remote);
  if (remote !== seen) {
    // Someone else (or a hand edit) changed it: follow along unless we have unsaved typing.
    setSeen(remote);
    if (!dirty) setValue(remote);
  }
  return {
    value,
    dirty,
    set: (v: string) => {
      setValue(v);
      setDirty(v !== remote);
    },
    reset: (v = remote) => {
      setValue(v);
      setDirty(false);
    },
  };
}

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function EditTask({ task, onClose }: { task: Task; onClose: () => void }) {
  const { update, remove, notify, memberById, activity, actor } = useTasks();
  const plan = planTextById().get(task.id);
  const custom = task.type === "custom";
  const title = useDraft(task.title);
  const summary = useDraft(task.summary);
  const notes = useDraft(task.notes);
  const [editingDesc, setEditingDesc] = useState(false);
  const desc = useDraft(task.description);
  const history = activity.filter((a) => a.taskId === task.id).slice(0, 25);

  const set = async (patch: Patch, msg?: string) => {
    const ok = await update(task.id, patch);
    if (ok && msg) notify(msg);
    return ok;
  };

  const saveTitle = async () => {
    const t = title.value.trim();
    if (t === task.title) return title.reset();
    if (!t && custom) {
      notify("A task needs a title", "error");
      return title.reset();
    }
    if (await set({ title: t }, t ? "Title saved" : "Title reset to the plan")) title.reset(t || plan?.title);
  };

  const saveSummary = async () => {
    const v = summary.value.trim();
    if (v === task.summary) return summary.reset();
    if (await set({ summary: v }, "Summary saved")) summary.reset(v || plan?.summary || "");
  };

  const saveNotes = async () => {
    if (notes.value.trim() === task.notes) return notes.reset();
    if (await set({ notes: notes.value }, "Notes saved")) notes.reset(notes.value.trim());
  };

  const saveDesc = async () => {
    const v = desc.value.trim();
    if (v !== task.description && !(await set({ description: v }, "Description saved"))) return;
    desc.reset(v || plan?.description || "");
    setEditingDesc(false);
  };

  const resetWording = async () => {
    if (await set({ title: "", summary: "", description: "" }, "Reset to the plan's wording")) {
      title.reset(plan?.title);
      summary.reset(plan?.summary);
      desc.reset(plan?.description);
      setEditingDesc(false);
    }
  };

  const assign = (id: string | null) => {
    const m = id ? memberById.get(id) : null;
    set({ assigneeId: id }, m ? `Assigned to ${m.name}` : "Unassigned");
  };

  return (
    <div className="drawer-body flex min-h-full flex-col">
      <DrawerHeader
        onClose={onClose}
        kicker={
          <>
            <span className="rounded-full border border-gold/40 px-2 py-0.5 text-gold-ink">{KIND_LABEL[task.type]}</span>
            {task.pillar && (
              <span className="inline-flex items-center gap-1.5 tracking-normal normal-case">
                <span className="size-2 rounded-full" style={{ background: pillarColor(task.pillar) }} />
                {task.pillar}
              </span>
            )}
          </>
        }
      >
        <label className="group/title relative mt-3 block">
          <span className="sr-only">Title</span>
          <input
            value={title.value}
            onChange={(e) => title.set(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={LIMITS.title}
            className="-mx-2 w-[calc(100%+1rem)] rounded-lg bg-transparent px-2 py-1 pr-8 font-display text-2xl leading-snug transition hover:bg-panel focus:bg-panel focus:ring-2 focus:ring-gold/30 focus:outline-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-faint opacity-0 transition group-hover/title:opacity-100">
            <PencilIcon />
          </span>
        </label>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
          {task.context}
          {isEdited(task) && (
            <>
              <span className="text-faint">·</span>
              <span className="text-gold-ink">Edited from the plan</span>
              <button type="button" onClick={resetWording} className="text-xs text-muted underline underline-offset-2 hover:text-fg">
                Reset wording
              </button>
            </>
          )}
        </p>
      </DrawerHeader>

      <div className="flex flex-1 flex-col gap-7 px-6 py-6">
        <Field label="Summary" hint={summary.dirty ? <span className="text-xs text-faint">Saves when you click away</span> : undefined}>
          <input
            value={summary.value}
            onChange={(e) => summary.set(e.target.value)}
            onBlur={saveSummary}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={LIMITS.summary}
            placeholder={plan?.summary || "One line shown on the task card"}
            className={inputCls}
          />
        </Field>

        <Field
          label="Description"
          hint={
            !editingDesc && (
              <button
                type="button"
                onClick={() => {
                  desc.reset();
                  setEditingDesc(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-gold-ink"
              >
                <PencilIcon className="size-3" /> Edit
              </button>
            )
          }
        >
          {editingDesc ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={desc.value}
                onChange={(e) => desc.set(e.target.value)}
                rows={12}
                maxLength={LIMITS.description}
                className={`${inputCls} font-mono text-[13px] leading-relaxed`}
                placeholder={"Context: why this matters\nSteps:\n- First step\n- Second step\nDone when: what finished looks like"}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-faint">Tip: start a line with “Label:” for a heading, or “- ” for a bullet.</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      desc.reset();
                      setEditingDesc(false);
                    }}
                    className="rounded-full px-3 py-1.5 text-sm text-muted hover:text-fg"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={saveDesc} className="rounded-full bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-2">
                    Save
                  </button>
                </span>
              </div>
            </div>
          ) : task.description ? (
            <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
              <DescriptionView text={task.description} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className="rounded-xl border border-dashed border-line-2 px-4 py-5 text-left text-sm text-muted transition hover:border-gold/60 hover:text-fg"
            >
              + Add a detailed description: context, steps, and what “done” looks like
            </button>
          )}
        </Field>

        <Field label="Owner">
          <OwnerPicker value={task.assigneeId} onChange={assign} />
        </Field>

        <Field label="Status">
          <Segmented
            label="Status"
            value={task.status}
            options={STATUSES}
            onChange={(s) => set({ status: s }, `Marked ${STATUS_LABEL[s].toLowerCase()}`)}
            render={StatusOption}
          />
        </Field>

        <div className="grid gap-7">
          <Field label="Priority">
            <Segmented label="Priority" value={task.priority} options={PRIORITIES} onChange={(p) => set({ priority: p })} render={(p) => PRIORITY_LABEL[p]} />
          </Field>
          <Field label="Due date" hint={task.due && <span className="text-xs text-faint">{formatDate(task.due)}</span>}>
            <DueInput value={task.due} status={task.status} onChange={(due) => set({ due })} />
          </Field>
        </div>

        {custom && (
          <Field label="Pillar">
            <PillarSelect value={task.pillar} onChange={(p) => set({ pillar: p })} />
          </Field>
        )}

        <Field label="Notes" hint={notes.dirty ? <span className="text-xs text-faint">Saves when you click away</span> : undefined}>
          <textarea
            value={notes.value}
            onChange={(e) => notes.set(e.target.value)}
            onBlur={saveNotes}
            rows={4}
            maxLength={LIMITS.notes}
            placeholder={task.type === "decision" ? "Record the decision taken, or what's needed to make it" : "Progress, links, blockers"}
            className={inputCls}
          />
        </Field>

        <Field label="History">
          {history.length ? (
            <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
              {history.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-gold/70 ring-4 ring-bg" />
                  <span className="text-fg">{h.by}</span> <span className="text-muted">{h.action}</span>
                  <span className="block text-[11px] text-faint" title={new Date(h.at).toLocaleString("en-IN")}>
                    {timeAgo(h.at)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-faint">No changes yet.</p>
          )}
        </Field>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur-xl">
        <span className="text-xs text-faint">
          {task.updatedBy ? `Updated ${timeAgo(task.updatedAt)} by ${task.updatedBy}` : `Added ${timeAgo(task.createdAt)}`}
          {!actor && <span className="block text-gold-ink">Tip: pick who you are in the Team panel so changes show your name.</span>}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (await remove(task.id)) onClose();
            }}
            title="Moves the task to Removed. You can undo or restore it."
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-st-blocked transition hover:bg-st-blocked/10"
          >
            <TrashIcon />
            Delete
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-line-2 px-5 py-2 text-sm transition hover:border-gold/60">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function TrashIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 9h6.6l.7-9M6.8 7v4M9.2 7v4" />
    </svg>
  );
}

export function PencilIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M10.8 2.7l2.5 2.5L5.6 12.9 2.5 13.5l.6-3.1z" />
      <path d="M9.4 4.1l2.5 2.5" />
    </svg>
  );
}

function PillarSelect({ value, onChange }: { value: string | null; onChange: (p: string | null) => void }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={inputCls}>
      <option value="">No pillar</option>
      {PILLARS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

/* ---------------- new ---------------- */

function NewTaskForm({ onDone }: { onDone: () => void }) {
  const { create, notify } = useTasks();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [pillar, setPillar] = useState<string | null>(null);
  const [assigneeId, setAssignee] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const ok = await create({ title, summary, description, pillar, assigneeId, status, priority, due });
    setBusy(false);
    if (ok) {
      notify("Task created");
      onDone();
    }
  };

  return (
    <form
      className="drawer-body flex min-h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <DrawerHeader onClose={onDone} kicker={<span className="rounded-full border border-gold/40 px-2 py-0.5 text-gold-ink">New task</span>}>
        <input
          autoFocus
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={LIMITS.title}
          placeholder="What needs to happen?"
          aria-label="Title"
          className="mt-3 w-full bg-transparent font-display text-2xl leading-snug placeholder:text-faint focus:outline-none"
        />
      </DrawerHeader>
      <div className="flex flex-1 flex-col gap-7 px-6 py-6">
        <Field label="Summary">
          <input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={LIMITS.summary} className={inputCls} placeholder="One line shown on the task card" />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            maxLength={LIMITS.description}
            className={`${inputCls} font-mono text-[13px] leading-relaxed`}
            placeholder={"Context: why this matters\nSteps:\n- First step\n- Second step\nDone when: what finished looks like"}
          />
        </Field>
        <Field label="Owner">
          <OwnerPicker value={assigneeId} onChange={setAssignee} />
        </Field>
        <Field label="Status">
          <Segmented label="Status" value={status} options={STATUSES} onChange={setStatus} render={StatusOption} />
        </Field>
        <div className="grid gap-7">
          <Field label="Priority">
            <Segmented label="Priority" value={priority} options={PRIORITIES} onChange={setPriority} render={(p) => PRIORITY_LABEL[p]} />
          </Field>
          <Field label="Due date">
            <DueInput value={due} onChange={setDue} status={status} />
          </Field>
        </div>
        <Field label="Pillar">
          <PillarSelect value={pillar} onChange={setPillar} />
        </Field>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur-xl">
        <button type="button" onClick={onDone} className="rounded-full px-4 py-2 text-sm text-muted hover:text-fg">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-black transition hover:bg-gold-2 disabled:opacity-50"
        >
          Create task
        </button>
      </div>
    </form>
  );
}
