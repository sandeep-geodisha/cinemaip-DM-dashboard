"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type ConfirmRequest = {
  title: string;
  message?: ReactNode;
  /** Label of the confirming button. */
  yes?: string;
  no?: string;
};

/** The question asked before a task is taken off the board. */
export function deleteTaskQuestion(t: { title: string; type: string }): ConfirmRequest {
  return {
    title: "Do you really want to delete this task?",
    message: (
      <>
        <span className="text-fg">“{t.title}”</span> will be taken off the board for everyone.{" "}
        {t.type === "custom" ? "It goes to Removed tasks, where it can be restored or deleted for good." : "It goes to Removed tasks, where it can be restored."}
      </>
    ),
  };
}

/**
 * "Are you sure?" pop-up used before anything is deleted. A native modal
 * <dialog>, so it sits above the task drawer, traps focus and closes on Esc.
 * "No" has focus first, so pressing Enter by accident never deletes.
 */
export function ConfirmDialog({ request, onAnswer }: { request: ConfirmRequest | null; onAnswer: (yes: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const answered = useRef(false);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (request && !dlg.open) {
      answered.current = false;
      dlg.showModal();
    }
    if (!request && dlg.open) dlg.close();
  }, [request]);

  const answer = (yes: boolean) => {
    if (answered.current) return;
    answered.current = true;
    onAnswer(yes);
  };

  return (
    <dialog
      ref={ref}
      onClose={() => answer(false)}
      onClick={(e) => e.target === ref.current && answer(false)}
      aria-labelledby="confirm-title"
      className="identify m-auto w-[min(420px,calc(100vw-2rem))] rounded-3xl border border-line-2 bg-popover p-0 text-fg shadow-[var(--shadow)]"
    >
      {request && (
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-st-blocked/12 text-st-blocked">
              <svg viewBox="0 0 16 16" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 9h6.6l.7-9M6.8 7v4M9.2 7v4" />
              </svg>
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 id="confirm-title" className="font-display text-lg leading-snug">
                {request.title}
              </h2>
              {request.message && <div className="mt-2 text-sm leading-relaxed text-muted">{request.message}</div>}
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => answer(false)}
              className="rounded-full border border-line-2 px-5 py-2.5 text-sm font-medium transition hover:border-gold/60"
            >
              {request.no ?? "No, keep it"}
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              className="rounded-full bg-st-blocked px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {request.yes ?? "Yes, delete"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
