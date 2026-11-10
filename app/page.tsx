import { ActsSection, BudgetSection, PillarProvider, SlateSection } from "@/components/budget-explorer";
import { CountUp, Effects } from "@/components/effects";
import { Nav } from "@/components/nav";
import { SectionHead } from "@/components/section-head";
import { TaskBoard } from "@/components/tasks/board";
import { TasksProvider } from "@/components/tasks/provider";
import { LiveStatus, OwnerChip } from "@/components/tasks/ui";
import { decisionTaskId } from "@/lib/tasks";
import {
  PILLARS,
  budgetSummary,
  criticEconomics,
  decisions,
  goals,
  initiatives,
  inr,
  lakh,
  payouts,
  pillarColor,
} from "@/lib/plan";

/** Splits a goal label such as "25K", "80%+" or "Top 5" into parts CountUp can animate. */
function parseLabel(label: string) {
  const m = label.match(/^(\D*)([\d,]+)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], value: Number(m[2].replace(/,/g, "")), suffix: m[3] };
}

// Fixed positions so server and client render the same motes.
const MOTES = Array.from({ length: 28 }, (_, i) => ({
  left: 30 + ((i * 37) % 40),
  top: 20 + ((i * 53) % 60),
  dur: 9 + ((i * 7) % 9),
  delay: -((i * 1.3) % 12),
  mx: ((i * 29) % 80) - 40,
}));

export default function Home() {
  const b = budgetSummary();
  const c = criticEconomics();
  const usersGoal = goals[0];
  const featured = goals.slice(0, 2);
  const rest = goals.slice(2);

  const kpis = [
    { label: "Total cash, six months", value: Number(lakh(b.totalK)), decimals: 2, prefix: "₹", suffix: "L", note: "No contingency line. Team time is the real cost." },
    { label: "Paid only on result", value: Number(lakh(b.onResultK)), decimals: 2, prefix: "₹", suffix: "L", note: `${b.onResultPct}% of cash: critic payouts, prizes, ambassador rewards.` },
    { label: "Spent upfront", value: b.upfrontK, decimals: 0, prefix: "₹", suffix: "K", note: "Tools, prints and model usage." },
    { label: "Cash per registered user", value: b.cashPerUser, decimals: 2, prefix: "₹", suffix: "", note: `At the goal of ${inr(b.userGoal)} users by month six.` },
  ];

  return (
    <>
      <Effects />
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />
      <TasksProvider>
      <PillarProvider>
      <Nav />

      <main id="top" className="relative z-10">
        {/* ================= HERO ================= */}
        <section className="relative flex min-h-[100svh] flex-col overflow-hidden pt-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="beam" />
            <div className="glow-orb top-[12%] left-[8%] size-[380px]" style={{ background: "var(--orb-violet)" }} />
            <div className="glow-orb right-[4%] bottom-[10%] size-[440px] [animation-delay:-6s]" style={{ background: "var(--orb-gold)" }} />
            {MOTES.map((m, i) => (
              <span
                key={i}
                className="mote"
                style={{
                  left: `${m.left}%`,
                  top: `${m.top}%`,
                  animationDuration: `${m.dur}s`,
                  animationDelay: `${m.delay}s`,
                  ["--mx" as string]: `${m.mx}px`,
                }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
          </div>

          <div className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div>
              <p
                className="fade-in inline-flex items-center gap-2.5 rounded-full border border-line-2 bg-panel px-3.5 py-1.5 text-xs text-muted backdrop-blur"
                style={{ ["--d" as string]: "100ms" }}
              >
                <span className="pulse-dot size-1.5 rounded-full bg-gold" />
                Digital marketing plan · Six months · Lean budget
              </p>

              <h1 className="mt-7 font-display text-[clamp(2.5rem,6.2vw,5.5rem)] leading-[1.02] tracking-[-0.045em]">
                <span className="block overflow-hidden pb-[0.08em]">
                  <span className="line-up" style={{ ["--d" as string]: "200ms" }}>
                    The road to
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.08em]">
                  <span className="line-up" style={{ ["--d" as string]: "340ms" }}>
                    <em className="gold-text pr-2 not-italic">{inr(usersGoal.target)}</em>
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.08em]">
                  <span className="line-up" style={{ ["--d" as string]: "480ms" }}>
                    movie lovers.
                  </span>
                </span>
              </h1>

              <div className="fade-in mt-10 flex flex-wrap gap-3" style={{ ["--d" as string]: "850ms" }}>
                <a
                  href="#budget"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-medium text-black shadow-[0_10px_40px_-10px_var(--gold)] transition hover:bg-gold-2"
                >
                  Explore the budget
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </a>
                <a
                  href="#acts"
                  className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-panel px-6 py-3.5 text-sm backdrop-blur transition hover:border-gold/50"
                >
                  See the three acts
                </a>
              </div>

              <dl className="fade-in mt-14 flex flex-wrap gap-x-7 gap-y-4 sm:gap-x-10" style={{ ["--d" as string]: "1000ms" }}>
                {[
                  ["Initiatives", initiatives.length],
                  ["Pillars", PILLARS.length],
                  ["Months", 6],
                  ["Acts", 3],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] tracking-[0.2em] text-faint uppercase">{k}</dt>
                    <dd className="tabular font-display text-2xl">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Ticket totalL={lakh(b.totalK)} perUser={b.cashPerUser} users={usersGoal.label} />
          </div>

          <a
            href="#numbers"
            className="fade-in relative mx-auto mb-8 flex flex-col items-center gap-2 text-[11px] tracking-[0.25em] text-faint uppercase transition hover:text-muted"
            style={{ ["--d" as string]: "1300ms" }}
          >
            Roll film
            <span className="relative h-10 w-px overflow-hidden bg-line">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2s_ease-in-out_infinite] bg-gold" />
            </span>
          </a>
        </section>

        {/* ================= MARQUEE ================= */}
        <div className="marquee-wrap relative border-y border-line bg-bg-2/60 py-4 backdrop-blur" aria-hidden>
          <div className="sprockets absolute inset-x-0 -top-[7px] opacity-60" />
          <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="marquee">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex shrink-0 items-center">
                  {initiatives.map((i) => (
                    <span key={i.id} className="flex items-center gap-4 px-6 font-display text-lg font-medium tracking-[-0.02em] whitespace-nowrap text-fg/75">
                      <span className="size-1.5 rounded-full" style={{ background: pillarColor(i.pillar) }} />
                      {i.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="sprockets absolute inset-x-0 -bottom-[7px] opacity-60" />
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-36 px-4 py-28 sm:px-6">
          {/* ================= KPIs ================= */}
          <section id="numbers" aria-label="Budget at a glance" className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <div
                key={k.label}
                data-reveal
                data-spot
                className="min-w-0 bg-bg p-7"
                style={{ ["--d" as string]: `${i * 100}ms` }}
              >
                <p className="text-xs tracking-wider text-muted uppercase">{k.label}</p>
                <p className="mt-4 font-display text-4xl leading-none sm:text-5xl">
                  <CountUp value={k.value} decimals={k.decimals} prefix={k.prefix} suffix={k.suffix} />
                </p>
                <p className="mt-4 text-sm leading-snug text-muted">{k.note}</p>
              </div>
            ))}
          </section>

          {/* ================= TARGETS ================= */}
          <section id="targets" className="scroll-mt-24">
            <SectionHead
              n="01"
              kicker="Box office targets"
              title={
                <>
                  What a <em className="gold-text not-italic">hit</em> looks like at month six
                </>
              }
              lede="Eight numbers the plan is built to reach. They are targets, not progress: tracking against them starts once the first act is live."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((g, i) => {
                const p = parseLabel(g.label);
                return (
                  <article
                    key={g.goal}
                    data-reveal
                    data-spot
                    className="card relative overflow-hidden p-8 sm:col-span-1 lg:col-span-2"
                    style={{ ["--d" as string]: `${i * 120}ms` }}
                  >
                    <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-gold/10 blur-3xl" />
                    <p className="text-xs tracking-[0.2em] text-gold-ink uppercase">Headline goal</p>
                    <p className="mt-6 font-display text-6xl leading-none sm:text-7xl">
                      {p ? <CountUp value={p.value} prefix={p.prefix} suffix={p.suffix} /> : g.label}
                    </p>
                    <h3 className="mt-4 text-xl font-medium">{g.goal}</h3>
                    <p className="mt-1.5 text-muted">{g.detail}</p>
                  </article>
                );
              })}
              {rest.map((g, i) => {
                const p = parseLabel(g.label);
                return (
                  <article
                    key={g.goal}
                    data-reveal
                    data-spot
                    className="card p-6"
                    style={{ ["--d" as string]: `${(i % 4) * 90}ms` }}
                  >
                    <p className="font-display text-4xl leading-none">
                      {p ? <CountUp value={p.value} prefix={p.prefix} suffix={p.suffix} /> : g.label}
                    </p>
                    <h3 className="mt-4 font-medium">{g.goal}</h3>
                    <p className="mt-1 text-sm leading-snug text-muted">{g.detail}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <TaskBoard />

          <ActsSection />

          <SlateSection />

          {/* ================= CRITICS ================= */}
          <section id="critics" className="scroll-mt-24">
            <SectionHead
              n="05"
              kicker="Critic economics"
              title={
                <>
                  Paying critics, with a <em className="gold-text not-italic">hard ceiling</em>
                </>
              }
              lede={
                <>
                  Each activated critic costs at most ₹{inr(c.maxCost)} for about {c.reviews} reviews, or ₹
                  {c.costPerReview} a review. Capping at {c.critics} critics caps payouts at ₹{c.payoutCapK}K. Points are
                  assumed to be worth ₹1 each.
                </>
              }
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { k: "Max cost per critic", v: c.maxCost, pre: "₹", suf: "", note: "₹500 bonus plus ₹500 earned" },
                  { k: "Reviews to cash out", v: c.reviews, pre: "~", suf: "", note: "On the fastest route" },
                  { k: "Cost per review", v: c.costPerReview, pre: "₹", suf: "", note: `₹${inr(c.maxCost)} ÷ ${c.reviews} reviews` },
                  { k: "Total payout cap", v: c.payoutCapK, pre: "₹", suf: "K", note: `${c.critics} critics × ₹${inr(c.maxCost)}` },
                ].map((s, i) => (
                  <div key={s.k} data-reveal data-spot className="card p-6" style={{ ["--d" as string]: `${i * 90}ms` }}>
                    <p className="text-xs text-muted">{s.k}</p>
                    <p className="mt-3 font-display text-4xl leading-none">
                      <CountUp value={s.v} prefix={s.pre} suffix={s.suf} />
                    </p>
                    <p className="mt-3 text-sm text-muted">{s.note}</p>
                  </div>
                ))}
              </div>

              <div data-reveal data-spot className="card p-7">
                <h3 className="font-medium">The route to a ₹{inr(c.maxCost)} cash-out</h3>
                <p className="mt-1 text-sm text-muted">Cash only leaves once a balance reaches the threshold.</p>
                <div data-reveal className="relative mt-8">
                  <div className="flex h-12 gap-[2px] overflow-hidden rounded-xl">
                    <div className="bar-fill flex h-full w-1/2 items-center rounded-l-xl bg-[linear-gradient(90deg,var(--gold-deep),color-mix(in_srgb,var(--gold)_70%,var(--gold-deep)))] px-4 text-sm font-medium text-black">
                      ₹500 joining bonus
                    </div>
                    <div
                      className="bar-fill flex h-full flex-1 items-center rounded-r-xl bg-gold px-4 text-sm font-medium text-black"
                      style={{ ["--d" as string]: "500ms" }}
                    >
                      + 500 pts earned
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-faint">
                    <span>₹0</span>
                    <span>₹500</span>
                    <span className="text-gold-ink">₹1,000 · cash-out</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-panel p-4">
                    <p className="text-[11px] tracking-wider text-gold-ink uppercase">Fastest route</p>
                    <p className="mt-1.5 font-display text-xl">10 new + 40 older reviews</p>
                    <p className="mt-1 text-sm text-muted">50 reviews × 10 pts = 500 pts</p>
                  </div>
                  <div className="rounded-xl border border-line bg-panel p-4">
                    <p className="text-[11px] tracking-wider text-gold-ink uppercase">Referral-only route</p>
                    <p className="mt-1.5 font-display text-xl">100 sign-ups</p>
                    <p className="mt-1 text-sm text-muted">100 referrals × 5 pts = 500 pts</p>
                  </div>
                </div>
              </div>
            </div>

            <div data-reveal className="card mt-5 overflow-x-auto">
              <table className="tabular w-full min-w-[560px] border-collapse text-sm">
                <caption className="px-6 pt-5 text-left text-xs tracking-wider text-muted uppercase">Payout rules</caption>
                <thead className="text-left text-xs text-faint">
                  <tr>
                    <th className="border-b border-line px-6 py-3 font-medium">Item</th>
                    <th className="border-b border-line px-6 py-3 font-medium">Rule</th>
                    <th className="border-b border-line px-6 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.item} className="transition-colors hover:bg-panel-2">
                      <td className="border-b border-line px-6 py-3.5 font-medium">{p.item}</td>
                      <td className="border-b border-line px-6 py-3.5 text-muted">{p.rule}</td>
                      <td className="border-b border-line px-6 py-3.5 text-right whitespace-nowrap">
                        {p.unit === "₹" ? `₹${inr(p.value)}` : `${inr(p.value)} ${p.unit}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ================= DECISIONS ================= */}
          <section id="decisions" className="scroll-mt-24">
            <SectionHead
              n="06"
              kicker="Before we roll"
              title={
                <>
                  {decisions.length} calls to make <em className="gold-text not-italic">before action</em>
                </>
              }
              lede="Open questions that change the budget, the build or the legal footing. Give each one an owner, then record the answer in its notes."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {decisions.map((d, i) => (
                <article
                  key={d.topic}
                  data-reveal
                  data-spot
                  className="card flex flex-col overflow-hidden"
                  style={{ ["--d" as string]: `${(i % 4) * 90}ms` }}
                >
                  <div
                    aria-hidden
                    className="h-3 bg-[repeating-linear-gradient(-45deg,rgb(var(--tint)/0.85)_0_10px,transparent_10px_20px)] opacity-[0.12]"
                  />
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="tabular font-mono text-xs text-faint">TAKE {String(i + 1).padStart(2, "0")}</span>
                      <LiveStatus taskId={decisionTaskId(d.topic)} />
                    </div>
                    <h3 className="mt-5 font-display text-2xl">{d.topic}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{d.question}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-6 py-3.5">
                    <span className="text-[11px] tracking-wider text-faint uppercase">Owner</span>
                    <OwnerChip taskId={decisionTaskId(d.topic)} />
                  </div>
                </article>
              ))}
              <a
                href="#board"
                data-reveal
                className="card group flex flex-col justify-between border-gold/30 bg-[radial-gradient(circle_at_100%_0%,rgb(232_182_90/0.18),transparent_60%)] p-6"
              >
                <span className="text-xs tracking-[0.2em] text-gold-ink uppercase">Next step</span>
                <span className="mt-8 font-display text-2xl leading-snug">
                  Assign owners on the task board, then Act I begins.
                  <span className="ml-2 inline-block transition-transform group-hover:-translate-y-1">↑</span>
                </span>
              </a>
            </div>
          </section>

          <BudgetSection />
        </div>

        {/* ================= CREDITS ================= */}
        <footer className="relative overflow-hidden border-t border-line">
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--gold),transparent)] opacity-50" />
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
            <p data-reveal className="text-[11px] tracking-[0.3em] text-gold-ink uppercase">The fine print</p>
            <h2 data-reveal className="mt-4 font-display text-3xl sm:text-4xl">About these numbers</h2>
            <ul data-reveal className="mx-auto mt-10 grid max-w-3xl gap-x-10 gap-y-5 text-left text-sm leading-relaxed text-muted sm:grid-cols-2">
              <li>All figures come from the CinemaIP Growth Plan draft, lean budget version. Rupee amounts are planning estimates, not quotes.</li>
              <li>Paid on result covers initiatives 7, 8, 9, 10 and 12. Everything else is spent upfront.</li>
              <li>Metro ads (initiative 5) are deferred and carry no spend in these six months.</li>
              <li>Cash per user divides total cash by the registered-user goal. It ignores team time, which is the plan&apos;s real cost.</li>
            </ul>
          </div>
          <div aria-hidden className="pointer-events-none select-none text-center font-display text-[18vw] leading-[0.85] text-fg/[0.04]">
            Fin.
          </div>
          <div className="border-t border-line py-6 text-center text-xs text-faint">
            Cinema<span className="text-gold-ink">IP</span> · Digital marketing plan · Six months
          </div>
        </footer>
      </main>
      </PillarProvider>
      </TasksProvider>
    </>
  );
}

function Ticket({ totalL, perUser, users }: { totalL: string; perUser: number; users: string }) {
  return (
    <div className="fade-in relative mx-auto w-full max-w-[400px] [perspective:1200px]" style={{ ["--d" as string]: "600ms" }}>
      <div className="relative rotate-[-3deg] transition-transform duration-700 hover:rotate-0 hover:[transform:rotateY(-6deg)_rotateX(4deg)]">
        <div aria-hidden className="absolute -inset-8 rounded-[40px] bg-gold/20 blur-3xl" />
        <div
          data-spot
          className="relative overflow-hidden rounded-[22px] border border-gold/40 bg-[linear-gradient(160deg,var(--ticket-a),var(--ticket-b)_55%,var(--ticket-a))] shadow-[var(--shadow)]"
        >
          <div className="absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(90deg,var(--gold)_0_1px,transparent_1px_14px)]" aria-hidden />
          <div className="relative p-7">
            <div className="flex items-center justify-between text-[10px] tracking-[0.3em] text-gold-ink uppercase">
              <span>Admit one</span>
              <span className="tabular font-mono">No. 000001</span>
            </div>
            <p className="mt-8 text-xs tracking-wider text-muted uppercase">Cash cost per moviegoer</p>
            <p className="mt-2 font-display text-7xl leading-none">
              <span className="gold-text">₹{perUser.toFixed(2)}</span>
            </p>
            <p className="mt-3 text-sm text-muted">
              ₹{totalL}L of total cash ÷ a goal of {users} registered users
            </p>
          </div>
          <div className="relative flex items-center" aria-hidden>
            <span className="absolute -left-3 size-6 rounded-full bg-bg" />
            <span className="mx-6 h-px flex-1 border-t border-dashed border-gold/40" />
            <span className="absolute -right-3 size-6 rounded-full bg-bg" />
          </div>
          <div className="relative grid grid-cols-3 gap-2 p-7 pt-6 text-center">
            {[
              ["Screen", "6 months"],
              ["Row", `${PILLARS.length} pillars`],
              ["Seat", `${initiatives.length} bets`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] tracking-[0.25em] text-faint uppercase">{k}</p>
                <p className="mt-1 font-display text-base">{v}</p>
              </div>
            ))}
          </div>
          <div className="relative flex h-10 items-end gap-[3px] px-7 pb-5" aria-hidden>
            {Array.from({ length: 44 }, (_, i) => (
              <span key={i} className="bg-gold/50" style={{ width: (i * 7) % 3 === 0 ? 3 : 1, height: `${55 + ((i * 13) % 45)}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
