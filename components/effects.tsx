"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Page-wide motion, mounted once:
 * - [data-reveal] elements get [data-in] the first time they scroll into view
 *   (including elements added later, e.g. after a filter change).
 * - [data-spot] cards get --sx/--sy so their spotlight follows the cursor.
 */
export function Effects() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const watch = (root: ParentNode) =>
      root.querySelectorAll("[data-reveal]:not([data-in])").forEach((el) => io.observe(el));
    watch(document);

    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && (n.matches("[data-reveal]") ? io.observe(n) : watch(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-spot]") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sx", `${e.clientX - r.left}px`);
      el.style.setProperty("--sy", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}

/** Counts up to `value` when scrolled into view. Server render shows the final value. */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1800,
  locale = "en-IN",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  locale?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    setN(0);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 4);
          setN(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const text = n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className={`tabular ${className ?? ""}`}>
      <span className="sr-only">
        {prefix}
        {value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {suffix}
      </span>
      <span aria-hidden>
        {prefix}
        {text}
        {suffix}
      </span>
    </span>
  );
}
