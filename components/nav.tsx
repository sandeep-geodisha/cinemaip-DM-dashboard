"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import logo from "@/assets/brand/cinemaip-logo.png";

const LINKS = [
  { id: "targets", label: "Targets" },
  { id: "team", label: "Team" },
  { id: "board", label: "Tasks" },
  { id: "acts", label: "Calendar" },
  { id: "slate", label: "Initiatives" },
  { id: "critics", label: "Critics" },
  { id: "decisions", label: "Decisions" },
  { id: "budget", label: "Budget" },
];

export function Nav() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-line bg-bg/70 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-[linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-2))]"
        style={{ transform: `scaleX(${progress})` }}
      />
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="CinemaIP, back to top">
          <Image src={logo} alt="CinemaIP" priority unoptimized className="h-6 w-auto transition-transform duration-500 group-hover:scale-[1.03] sm:h-7" />
        </a>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active === l.id ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {active === l.id && (
                  <span className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-panel-2" />
                )}
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#board"
            className="rounded-full bg-gold px-4 py-2 text-sm font-medium whitespace-nowrap text-black transition hover:bg-gold-2"
          >
            Task board
          </a>
        </div>
      </nav>
    </header>
  );
}


type Theme = "light" | "dark";

const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const subscribeTheme = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {}
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduce) {
      if (!reduce) {
        root.classList.add("theme-fade");
        window.setTimeout(() => root.classList.remove("theme-fade"), 500);
      }
      apply();
      return;
    }

    // Circular reveal of the new theme, growing out of the button.
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="relative grid size-9 place-items-center overflow-hidden rounded-full border border-line-2 bg-panel text-fg transition hover:border-gold/60 hover:text-gold-ink"
    >
      {/* Sun */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={`absolute size-[18px] transition-all duration-500 ${
          theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Moon */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={`absolute size-[17px] transition-all duration-500 ${
          theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      >
        <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
      </svg>
    </button>
  );
}
