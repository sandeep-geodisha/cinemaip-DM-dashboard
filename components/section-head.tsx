import type { ReactNode } from "react";

/** Section opener: reel number, kicker, serif headline, lede. */
export function SectionHead({
  n,
  kicker,
  title,
  lede,
}: {
  n: string;
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div data-reveal className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-end">
      <div>
        <p className="flex items-center gap-3 text-[11px] tracking-[0.25em] text-muted uppercase">
          <span className="tabular font-mono text-gold-ink">Reel {n}</span>
          <span className="h-px w-10 bg-gold/40" />
          {kicker}
        </p>
        <h2 className="mt-4 font-display text-3xl leading-[1.08] text-balance sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      </div>
      {lede && <p className="max-w-[56ch] leading-relaxed text-pretty text-muted md:pb-2">{lede}</p>}
    </div>
  );
}
