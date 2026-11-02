"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import type { ComponentType } from "react";

import {
  CameraIcon,
  FolderIcon,
  GalleryIcon,
  HomeIcon,
  MenuIcon,
  PlusIcon,
} from "@/components/nav/nav-icons";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { useWidgets } from "@/components/widgets/widgets-provider";

type Icon = ComponentType<{ className?: string }>;

type Destination = {
  label: string;
  icon: Icon;
  /** Only destinations that actually exist get a link. */
  href?: string;
};

/**
 * The navbar's five destinations. Only `/` and the homepage's gallery section
 * exist today; Folders, Photo Booth and Widgets have no route or UI, so they
 * render as clearly unavailable entries instead of dead links or invented
 * pages.
 */
const DESTINATIONS: readonly Destination[] = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "Gallery", href: "/#gallery", icon: GalleryIcon },
  { label: "Collections", icon: FolderIcon },
  { label: "Photo Booth", icon: CameraIcon },
];

const UNAVAILABLE_HINT = "Coming soon — no page exists yet";
const ADD_MEMORY_HINT =
  "Photo uploads aren't built yet, so there is nothing to add to";
const ADD_COLLECTION_HINT =
  "Collection creation isn't built yet, so there is nothing to add";
const NEW_PHOTO_BOOTH_HINT =
  "Photo Booth creation isn't built yet, so there is nothing to add";

export function SiteNav() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const pillTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 32 };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/85 px-3 pt-3 backdrop-blur-sm sm:px-4 sm:pt-4">
        <div className="relative mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl border border-paper-edge bg-paper px-3 py-2 shadow-[0_12px_30px_-22px_rgba(73,52,61,0.75)] sm:gap-4 lg:rounded-[22px] lg:px-5 lg:py-2.5">
            <Link
              href="/"
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full outline-offset-4"
              aria-label="Mimori — home"
            >
              <BowSticker className="h-9 w-9 sm:h-10 sm:w-10 select-none" />
              <span className="font-decorative text-2xl leading-none text-warm-charcoal sm:text-[1.7rem]">
                Mimori
              </span>
            </Link>

            <nav
              aria-label="Main"
              className="hidden justify-self-center lg:block"
            >
              <ul className="flex items-center gap-1">
                {DESTINATIONS.map((destination) => (
                  <li key={destination.label}>
                    <DesktopDestination
                      destination={destination}
                      active={pathname === destination.href}
                      transition={pillTransition}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center justify-end gap-2">
              <AddMemoryButton className="hidden lg:inline-flex" />

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-paper-edge text-warm-charcoal transition-colors hover:bg-blush-pink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                id={menuId}
                initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }
                }
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.18,
                  ease: "easeOut",
                }}
                className="absolute inset-x-0 mt-2 origin-top rounded-2xl border border-paper-edge bg-paper p-3 shadow-[0_18px_40px_-24px_rgba(73,52,61,0.8)] lg:hidden"
              >
                <AddMemoryButton className="w-full justify-center" />
                <p className="mt-2 px-1 text-center text-xs text-warm-charcoal/60">
                  {pathname === "/"
                    ? "Pick a scrapbook piece for your little desktop."
                    : "Saving new memories arrives with photo uploads."}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      <nav
        aria-label="Main"
        onClick={() => setMenuOpen(false)}
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-0.5 rounded-2xl border border-paper-edge bg-paper px-1.5 py-1.5 shadow-[0_-10px_30px_-22px_rgba(73,52,61,0.9)]">
          {DESTINATIONS.map((destination) => (
            <li key={destination.label}>
              <MobileDestination
                destination={destination}
                active={pathname === destination.href}
                transition={pillTransition}
              />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

type DestinationProps = {
  destination: Destination;
  active: boolean;
  transition:
    | { duration: number }
    | { type: "spring"; stiffness: number; damping: number };
};

function DesktopDestination({
  destination,
  active,
  transition,
}: DestinationProps) {
  const Icon = destination.icon;
  const base =
    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium";

  if (!destination.href) {
    return (
      <span
        aria-disabled="true"
        title={UNAVAILABLE_HINT}
        className={`${base} cursor-default text-warm-charcoal/45`}
      >
        <Icon className="h-4 w-4" />
        {destination.label}
      </span>
    );
  }

  return (
    <Link
      href={destination.href}
      aria-current={active ? "page" : undefined}
      className={`${base} cursor-pointer transition-colors ${
        active
          ? "text-deep-candy-pink"
          : "text-warm-charcoal/75 hover:text-warm-charcoal"
      }`}
    >
      {active ? (
        <motion.span
          layoutId="nav-active-pill"
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-blush-pink"
          transition={transition}
        />
      ) : null}

      <Icon className="relative h-4 w-4" />
      <span className="relative">{destination.label}</span>

      {active ? (
        <HeartDoodle
          filled
          className="absolute -top-1 -right-0.5 h-2.5 w-2.5 rotate-12 text-candy-pink"
        />
      ) : null}
    </Link>
  );
}

function MobileDestination({
  destination,
  active,
  transition,
}: DestinationProps) {
  const Icon = destination.icon;
  const base =
    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium";

  if (!destination.href) {
    return (
      <span
        aria-disabled="true"
        title={UNAVAILABLE_HINT}
        className={`${base} cursor-default text-warm-charcoal/45`}
      >
        <Icon className="h-[18px] w-[18px]" />
        <span className="leading-tight">{destination.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={destination.href}
      aria-current={active ? "page" : undefined}
      className={`${base} cursor-pointer transition-colors ${
        active ? "text-deep-candy-pink" : "text-warm-charcoal/70"
      }`}
    >
      <span className="relative flex h-7 w-7 items-center justify-center">
        {active ? (
          <motion.span
            layoutId="nav-mobile-active-pill"
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-blush-pink"
            transition={transition}
          />
        ) : null}
        <Icon className="relative h-[18px] w-[18px]" />
        {active ? (
          <HeartDoodle
            filled
            className="absolute -top-0.5 -right-0.5 h-2 w-2 text-candy-pink"
          />
        ) : null}
      </span>
      <span className="leading-tight">{destination.label}</span>
    </Link>
  );
}

function AddMemoryButton({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { openAdd } = useWidgets();

  // The homepage is the only destination with a creation flow: adding widgets
  // to the scrapbook desktop. Every other page still has nothing behind it.
  if (pathname === "/") {
    return (
      <button
        type="button"
        onClick={openAdd}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover ${className}`}
      >
        <PlusIcon className="h-4 w-4" />
        Add Widgets
      </button>
    );
  }

  const buttonMap: Record<string, { label: string; hint: string }> = {
    "/#gallery": { label: "+ Add Memory", hint: ADD_MEMORY_HINT },
    // Collections and Photo Booth have no built routes/UIs yet
    "/collections": { label: "+ Add Collection", hint: ADD_COLLECTION_HINT },
    "/photo-booth": { label: "+ New Photo Booth", hint: NEW_PHOTO_BOOTH_HINT },
  };

  const buttonInfo = buttonMap[pathname] ?? {
    label: "+ Add Memory",
    hint: ADD_MEMORY_HINT,
  };

  return (
    <button
      type="button"
      disabled
      title={buttonInfo.hint}
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-shadow disabled:cursor-not-allowed disabled:opacity-95 ${className}`}
    >
      <PlusIcon className="h-4 w-4" />
      {buttonInfo.label}
    </button>
  );
}
