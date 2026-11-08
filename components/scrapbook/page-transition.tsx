"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The scrapbook's page turn.
 *
 * The layout's content column renders through this wrapper, so arriving on
 * Home, Gallery, Collections or Photo Booth behaves like a sheet of paper being
 * laid on the page — it lifts a few pixels and fades in — instead of a hard cut.
 *
 * It lives in the layout, not in each page, because the layout is the only
 * element that survives a navigation: the column is the same DOM node before
 * and after, so the animation can restart without remounting the page, without
 * resetting its state and without touching Suspense, the navbar or any dialog.
 * Only this column animates, for a third of a second, and only `opacity` and
 * `transform` — both composited, so it stays cheap on a phone.
 *
 * The effect re-runs on `pathname`, which means it plays for browser
 * back/forward as well as in-app links, and never for search-param changes or
 * an opened dialog. `prefers-reduced-motion` skips it entirely, leaving the
 * page exactly where it would have been.
 */
const PAGE_SETTLE = [
  { opacity: 0, transform: "translateY(14px)" },
  { opacity: 1, transform: "none" },
];

type PageTransitionProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sheet.current;

    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const settle = element.animate(PAGE_SETTLE, {
      duration: 380,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    });

    // A navigation during the animation cancels the old pass rather than
    // stacking a second one on top of it.
    return () => settle.cancel();
  }, [pathname]);

  return (
    <div ref={sheet} className={className}>
      {children}
    </div>
  );
}
