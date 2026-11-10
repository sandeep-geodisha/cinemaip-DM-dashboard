"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import {
  budgetSummary,
  initiatives,
  lakh,
  phases,
  pillarColor,
  pillarTotals,
  sharePct,
  type Initiative,
  type Pillar,
} from "@/lib/plan";
import { SectionHead } from "@/components/section-head";
import { OwnerChip } from "@/components/tasks/ui";
import { activityTaskId, initiativeTaskId } from "@/lib/tasks";

const pad2 = (n: number) => String(n).padStart(2, "0");
const ROMAN = ["I", "II", "III"];

/* ---------------- Shared pillar filter ---------------- */

// The budget, calendar and initiative sections sit in different places on the
// page but share one pillar filter, so the choice lives in this context.
type PillarCtx = { pillar: Pillar | ""; setPillar: (p: Pillar | "") => void; active: (i: Initiative) => boolean };
const PillarContext = createContext<PillarCtx | null>(null);

export function PillarProvider({ children }: { children: ReactNode }) {
  const [pillar, setPillar] = useState<Pillar | "">("");
  const active = (i: Initiative) => !pillar || i.pillar === pillar;
  return <PillarContext.Provider value={{ pillar, setPillar, active }}>{children}</PillarContext.Provider>;
}

function usePillar() {
  const c = useContext(PillarContext);
  if (!c) throw new Error("usePillar must be used inside <PillarProvider>");
  return c;
}

/* ---------------- Sections ---------------- */

export function BudgetSection() {
  const { pillar, setPillar, active } = usePillar();
  return (
    <section id="budget" className="relative scroll-mt-24">
      <SectionHead
        n="07"
        kicker="The budget"
        title={
          <>
            Where every <em className="gold-text not-italic">rupee</em> goes
          </>
        }
        lede="Most of the cash only leaves when a result arrives: a verified sign-up, an approved review, a contest entry. Picking a pillar here also filters the calendar and the initiatives above."
      />

      <PillarFilter value={pillar} onChange={setPillar} />

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div data-reveal data-spot className="card min-w-0 p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">By initiative</h3>
            <p className="text-xs text-muted">₹ thousand, largest first · hover a bar for detail</p>
          </div>
          <BudgetBars active={active} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div data-reveal data-spot className="card p-6 sm:p-7" style={{ ["--d" as string]: "120ms" }}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-medium">By pillar</h3>
              <p className="text-xs text-muted">share of cash</p>
            </div>
            <PillarDonut selected={pillar} onSelect={setPillar} />
          </div>
          <div data-reveal data-spot className="card p-6 sm:p-7" style={{ ["--d" as string]: "220ms" }}>
            <PaymentSplit />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ActsSection() {
  const { pillar, setPillar, active } = usePillar();
  return (
    <section id="acts" className="relative scroll-mt-24">
      <SectionHead
        n="03"
        kicker="The calendar"
        title={
          <>
            Six months, told in <em className="gold-text not-italic">three acts</em>
          </>
        }
        lede="Foundations first, because search and critic content take weeks to pay off. Contests follow once there is a base of users and pages. Then the budget moves to whatever converted."
      />
      <PillarFilter value={pillar} onChange={setPillar} compact />
      <Acts active={active} />
    </section>
  );
}

export function SlateSection() {
  const { pillar, setPillar, active } = usePillar();
  return (
    <section id="slate" className="relative scroll-mt-24">
      <SectionHead
        n="04"
        kicker="The slate"
        title={
          <>
            Twelve initiatives, <em className="gold-text not-italic">one</em> lean budget
          </>
        }
        lede="How each line stays cheap, the number that proves it works, and the one thing to watch. Open any card for the full brief."
      />
      <PillarFilter value={pillar} onChange={setPillar} compact />
      <Slate rows={initiatives.filter(active)} />
    </section>
  );
}

/* ---------------- Filter ---------------- */

function PillarFilter({
  value,
  onChange,
  compact = false,
}: {
  value: Pillar | "";
  onChange: (p: Pillar | "") => void;
  compact?: boolean;
}) {
  const totals = pillarTotals();
  const opts: { key: Pillar | ""; label: string; sub: string }[] = [
    { key: "", label: "All pillars", sub: `${initiatives.length} initiatives` },
    ...totals.map((t) => ({ key: t.pillar, label: t.pillar, sub: `₹${t.budgetK}K` })),
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Filter by pillar"
      className={`flex flex-wrap gap-2 ${compact ? "mt-6" : "mt-10"}`}
    >
      {opts.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.label}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.key)}
            className={`group flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
              on
                ? "border-gold/60 bg-gold/10 text-fg shadow-[0_0_30px_-8px_var(--gold)]"
                : "border-line bg-panel text-muted hover:border-line-2 hover:text-fg"
            }`}
          >
            <span
              className="size-2 rounded-full transition-transform group-hover:scale-125"
              style={{ background: o.key ? pillarColor(o.key) : "var(--gold)" }}
            />
            {o.label}
            {!compact && <span className="tabular text-xs text-faint">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Bars ---------------- */

function BudgetBars({ active }: { active: (i: Initiative) => boolean }) {
  const [hover, setHover] = useState<{ row: Initiative; x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rows = [...initiatives].sort((a, b) => b.budgetK - a.budgetK || a.id - b.id);
  const max = Math.max(...rows.map((r) => r.budgetK), 1);

  return (
    <div ref={boxRef} className="relative" onPointerLeave={() => setHover(null)}>
      <ul
        data-reveal
        aria-label="Cash budget by initiative in thousands of rupees, largest first, colored by pillar"
        className="flex flex-col gap-3"
      >
        {rows.map((r, idx) => {
          const on = active(r);
          return (
            <li
              key={r.id}
              className="group cursor-default transition-opacity duration-500"
              style={{ opacity: on ? 1 : 0.18 }}
              onPointerMove={(e) => {
                const box = boxRef.current?.getBoundingClientRect();
                if (box) setHover({ row: r, x: e.clientX - box.left, y: e.clientY - box.top });
              }}
            >
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate">
                  <span className="tabular mr-2 font-mono text-[11px] text-faint">{pad2(r.id)}</span>
                  {r.name}
                </span>
                <span className="tabular flex shrink-0 items-center gap-2 text-xs text-muted">
                  {r.payment === "Pay on result" && (
                    <span className="rounded-full border border-gold/40 px-1.5 py-px text-[10px] text-gold-ink">on result</span>
                  )}
                  {r.budgetK === 0 ? "deferred" : `₹${r.budgetK}K`}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-[rgb(var(--tint)/0.06)]">
                <div
                  className="bar-fill h-full rounded-full transition-[filter] group-hover:brightness-125"
                  style={{
                    width: r.budgetK > 0 ? `max(4px, ${(r.budgetK / max) * 100}%)` : 0,
                    background: `linear-gradient(90deg, color-mix(in srgb, ${pillarColor(r.pillar)} 55%, transparent), ${pillarColor(r.pillar)})`,
                    ["--d" as string]: `${idx * 70}ms`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {hover && (
        <div
          role="status"
          className="pointer-events-none absolute z-20 w-64 rounded-xl border border-line-2 bg-popover/95 px-4 py-3 text-xs leading-relaxed backdrop-blur"
          style={{ left: `min(${hover.x + 14}px, calc(100% - 16rem))`, top: hover.y + 16, boxShadow: "var(--shadow)" }}
        >
          <div className="mb-1 flex items-center gap-2 font-medium text-fg">
            <span className="size-2 rounded-full" style={{ background: pillarColor(hover.row.pillar) }} />
            {hover.row.name}
          </div>
          <div className="tabular text-fg">
            ₹{hover.row.budgetK}K · {sharePct(hover.row.budgetK)}% of cash
          </div>
          <div className="text-muted">
            {hover.row.pillar} · {hover.row.payment}
          </div>
          <div className="mt-1.5 border-t border-line pt-1.5 text-muted">{hover.row.costControl}</div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Donut ---------------- */

function PillarDonut({ selected, onSelect }: { selected: Pillar | ""; onSelect: (p: Pillar | "") => void }) {
  const [hover, setHover] = useState<Pillar | null>(null);
  const rows = pillarTotals();
  const total = rows.reduce((s, r) => s + r.budgetK, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  const GAP = 3;
  const focus = hover ?? (selected || null);
  const focusRow = rows.find((r) => r.pillar === focus);

  const lens = rows.map((r) => (total ? (r.budgetK / total) * C : 0));
  const segs = rows.map((r, i) => {
    const start = lens.slice(0, i).reduce((s, x) => s + x, 0);
    return { ...r, len: Math.max(0, lens[i] - GAP), rot: (start / C) * 360 - 90, i };
  });

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-1">
      <div data-reveal className="relative mx-auto size-[180px]">
        <svg viewBox="0 0 180 180" className="size-full" role="img" aria-label="Cash share by pillar">
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgb(var(--tint) / 0.07)" strokeWidth="16" />
          {segs.map((s) => {
            const dim = focus && focus !== s.pillar;
            return (
              <circle
                key={s.pillar}
                className="donut-seg cursor-pointer"
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={pillarColor(s.pillar)}
                strokeWidth={focus === s.pillar ? 20 : 16}
                strokeLinecap="butt"
                strokeDasharray={`${s.len} ${C}`}
                transform={`rotate(${s.rot} 90 90)`}
                style={{ opacity: dim ? 0.2 : 1, ["--len" as string]: s.len, ["--d" as string]: `${s.i * 180}ms` }}
                onPointerEnter={() => setHover(s.pillar)}
                onPointerLeave={() => setHover(null)}
                onClick={() => onSelect(selected === s.pillar ? "" : s.pillar)}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-3xl leading-none">
            {focusRow ? `₹${focusRow.budgetK}K` : `₹${lakh(total)}L`}
          </span>
          <span className="mt-1.5 max-w-[110px] text-[11px] leading-tight text-muted">
            {focusRow ? `${focusRow.sharePct}% · ${focusRow.pillar}` : "total cash"}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.pillar}>
            <button
              onClick={() => onSelect(selected === r.pillar ? "" : r.pillar)}
              onPointerEnter={() => setHover(r.pillar)}
              onPointerLeave={() => setHover(null)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                focus === r.pillar ? "bg-panel-2" : "hover:bg-panel"
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: pillarColor(r.pillar) }} />
              <span className="min-w-0 flex-1 truncate">{r.pillar}</span>
              <span className="tabular text-xs text-muted">₹{r.budgetK}K</span>
              <span className="tabular w-12 text-right text-xs text-fg">{r.sharePct}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Payment split ---------------- */

function PaymentSplit() {
  const b = budgetSummary();
  const resultPct = b.totalK ? (b.onResultK / b.totalK) * 100 : 0;
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="font-medium">When the cash leaves</h3>
        <p className="text-xs text-muted">₹ thousand</p>
      </div>
      <div data-reveal className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        <div
          className="bar-fill h-full rounded-l-full bg-[linear-gradient(90deg,var(--gold-deep),var(--gold))]"
          style={{ width: `${resultPct}%` }}
        />
        <div
          className="bar-fill h-full flex-1 rounded-r-full bg-upfront/70"
          style={{ ["--d" as string]: "400ms" }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full bg-gold" />
            Paid on result
          </div>
          <div className="tabular mt-1 font-display text-2xl">
            ₹{b.onResultK}K <span className="font-sans text-sm text-muted">{b.onResultPct}%</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-muted">
            <span className="size-2 rounded-full bg-upfront" />
            Spent upfront
          </div>
          <div className="tabular mt-1 font-display text-2xl">
            ₹{b.upfrontK}K <span className="font-sans text-sm text-muted">{100 - b.onResultPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Acts (calendar) ---------------- */

function Acts({ active }: { active: (i: Initiative) => boolean }) {
  const byId = new Map(initiatives.map((i) => [i.id, i]));
  return (
    <div className="relative mt-10 grid gap-6 lg:grid-cols-3">
      {phases.map((p, pi) => (
        <article
          key={p.phase}
          data-reveal
          className="relative"
          style={{ ["--d" as string]: `${pi * 160}ms` }}
        >
          <div className="mb-5 flex items-center gap-4">
            <span className="relative z-10 grid size-[60px] shrink-0 place-items-center rounded-full border border-gold/50 bg-bg font-display text-xl text-gold-ink shadow-[0_0_40px_-10px_var(--gold)]">
              {ROMAN[pi]}
            </span>
            <div>
              <p className="text-[11px] tracking-[0.2em] text-muted uppercase">
                Act {ROMAN[pi]} · {p.period}
              </p>
              <h3 className="font-display text-2xl leading-tight">{p.name}</h3>
            </div>
          </div>
          <ol className="relative flex flex-col gap-2.5 pl-[29px]">
            <span
              aria-hidden
              data-reveal
              className="timeline-line absolute top-0 bottom-3 left-[29px] w-px -translate-x-1/2 bg-[linear-gradient(180deg,var(--gold),transparent)] opacity-40"
            />
            {p.activities.map((a, ai) => {
              const ini = byId.get(a.initiativeId)!;
              const on = active(ini);
              return (
                <li
                  key={a.activity}
                  data-spot
                  className="card relative ml-5 px-4 py-3 transition-all duration-500"
                  style={{ opacity: on ? 1 : 0.2, transform: on ? "none" : "scale(0.98)", transitionDelay: `${ai * 30}ms` }}
                >
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-[25px] size-2 -translate-y-1/2 rounded-full ring-4 ring-bg"
                    style={{ background: pillarColor(ini.pillar) }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[11px] text-muted">
                        <span className="tabular font-mono text-faint">{pad2(ini.id)}</span>
                        {ini.name}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug">{a.activity}</p>
                    </div>
                    <OwnerChip taskId={activityTaskId(p.phase, a.initiativeId)} compact />
                  </div>
                </li>
              );
            })}
          </ol>
        </article>
      ))}
    </div>
  );
}

/* ---------------- Slate (initiative cards) ---------------- */

function Slate({ rows }: { rows: Initiative[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const allOpen = sorted.length > 0 && sorted.every((r) => open.has(r.id));
  const toggle = (id: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
        <span className="tabular">
          Showing {sorted.length} of {initiatives.length}
        </span>
        <button
          onClick={() => setOpen(allOpen ? new Set() : new Set(sorted.map((r) => r.id)))}
          className="rounded-full border border-line px-3.5 py-1.5 transition hover:border-line-2 hover:text-fg"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r, i) => {
          const isOpen = open.has(r.id);
          return (
            <article
              key={r.id}
              data-reveal
              data-spot
              className="card group flex flex-col overflow-hidden"
              style={{ ["--d" as string]: `${(i % 3) * 90}ms` }}
            >
              <div
                aria-hidden
                className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${pillarColor(r.pillar)}, transparent)` }}
              />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display text-4xl leading-none text-fg/15 transition-colors duration-500 group-hover:text-gold-ink/80">
                    {pad2(r.id)}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap ${
                      r.payment === "Pay on result" ? "border-gold/40 text-gold-ink" : "border-line-2 text-muted"
                    }`}
                  >
                    {r.payment === "Pay on result" ? "Paid on result" : "Upfront"}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl leading-snug">{r.name}</h3>
                <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                  <span className="size-2 rounded-full" style={{ background: pillarColor(r.pillar) }} />
                  {r.pillar}
                </p>
                <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
                  <div>
                    <p className="text-[11px] tracking-wider text-faint uppercase">Budget</p>
                    <p className="tabular mt-0.5 text-xl font-medium">
                      {r.budgetK === 0 ? "Deferred" : `₹${r.budgetK}K`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] tracking-wider text-faint uppercase">Share</p>
                    <p className="tabular mt-0.5 text-xl font-medium">{sharePct(r.budgetK)}%</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  <span className="text-fg">Success looks like: </span>
                  {r.measure}
                </p>

                <div className="expand" data-open={isOpen ? "" : undefined}>
                  <div>
                    <dl className="mt-4 space-y-3 border-t border-line pt-4 text-sm leading-relaxed">
                      <div>
                        <dt className="text-[11px] tracking-wider text-gold-ink uppercase">How it stays cheap</dt>
                        <dd className="mt-0.5 text-muted">{r.costControl}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] tracking-wider text-gold-ink uppercase">Watch out for</dt>
                        <dd className="mt-0.5 text-muted">{r.watch}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <button
                  onClick={() => toggle(r.id)}
                  aria-expanded={isOpen}
                  className="flex items-center gap-2 text-sm text-fg/80 transition hover:text-gold-ink"
                >
                  {isOpen ? "Less" : "Full brief"}
                  <svg
                    viewBox="0 0 16 16"
                    className={`size-3.5 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
                <OwnerChip taskId={initiativeTaskId(r.id)} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
