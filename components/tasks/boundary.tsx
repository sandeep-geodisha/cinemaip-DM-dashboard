"use client";

import { Component, type ReactNode } from "react";

/** Keeps a rendering error in the task board from blanking the page. Data on the server is untouched. */
export class BoardBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Task board crashed", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section id="board" className="scroll-mt-24">
        <div role="alert" className="rounded-2xl border border-st-blocked/50 bg-st-blocked/[0.08] px-6 py-5">
          <p className="font-medium">The task board hit a problem and couldn&apos;t be shown.</p>
          <p className="mt-1 text-sm text-muted">Nothing was lost; the board is saved on the server. Reloading usually fixes it.</p>
          <button
            onClick={() => location.reload()}
            className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-medium text-black transition hover:bg-gold-2"
          >
            Reload the page
          </button>
        </div>
      </section>
    );
  }
}
