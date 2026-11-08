"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { ComponentType } from "react";

import {
  CameraIcon,
  FolderIcon,
  GalleryIcon,
  HomeIcon,
  PlusIcon,
} from "@/components/nav/nav-icons";
import { useCollections } from "@/components/collections/collections-provider";
import { useGalleryUpload } from "@/components/gallery/gallery-upload-context";
import { HeartDoodle } from "@/components/scrapbook/doodles";
import { useWidgets } from "@/components/widgets/widgets-provider";
import Image from "next/image";

type Icon = ComponentType<{ className?: string }>;

type Destination = {
  label: string;
  icon: Icon;
  /** Only destinations that actually exist get a link. */
  href?: string;
};

/**
 * The navbar's four destinations. All four have a route: `/`, `/gallery`,
 * `/collections` and `/photo-booth` (whose setup screen is live; capture comes
 * in a later phase).
 */
const DESTINATIONS: readonly Destination[] = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "Gallery", href: "/gallery", icon: GalleryIcon },
  { label: "Collections", href: "/collections", icon: FolderIcon },
  { label: "Photo Booth", href: "/photo-booth", icon: CameraIcon },
];

/** A destination stays active on its own sub-pages, such as one collection. */
function isActive(pathname: string, href?: string): boolean {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const UNAVAILABLE_HINT = "Coming soon — no page exists yet";
const ADD_MEMORY_HINT = "Open the Gallery to add a memory";

export function SiteNav() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const pillTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 32 };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/85 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-4 sm:pt-4">
        <div className="relative mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl border border-paper-edge bg-paper px-3 py-2 shadow-[0_12px_30px_-22px_rgba(73,52,61,0.75)] sm:gap-4 lg:rounded-[22px] lg:px-5 lg:py-2.5">
            <Link
              href="/"
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full outline-offset-4"
              aria-label="Mimori — home"
            >
              <Image alt="Mimori" src="/logo.svg" width={40} height={40} />
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
                      active={isActive(pathname, destination.href)}
                      transition={pillTransition}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            {/* The page's own creation action, on every size: the bottom bar
                carries navigation, so the header carries the one action. */}
            <div className="flex items-center justify-end">
              <PrimaryActionButton compact />
            </div>
          </div>
        </div>
      </header>

      {/* The bottom bar is fixed above the page and keeps its distance from a
          home indicator through the safe-area inset. The container is only a
          positioning frame: it is pointer-transparent so the strip around the
          floating panel (and the corners beside it) still taps the page
          underneath, exactly like a native tab bar's empty edges. */}
      <nav
        aria-label="Main"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-0.5 rounded-2xl border border-paper-edge bg-paper px-1.5 py-1.5 shadow-[0_-10px_30px_-22px_rgba(73,52,61,0.9)]">
          {DESTINATIONS.map((destination) => (
            <li key={destination.label}>
              <MobileDestination
                destination={destination}
                active={isActive(pathname, destination.href)}
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

/**
 * The header's single action. `compact` tightens it below `sm`, where the
 * header shares the row with the wordmark and the longest label
 * ("New Photo Booth") would otherwise wrap onto a second line.
 */
function PrimaryActionButton({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { openAdd } = useWidgets();
  const { openCreate } = useCollections();

  const { openUpload } = useGalleryUpload();

  const buttonClass = `inline-flex items-center rounded-full bg-primary font-semibold whitespace-nowrap text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover ${
    compact
      ? "gap-1 px-3 py-2 text-[13px] sm:gap-1.5 sm:px-4 sm:text-sm"
      : "gap-1.5 px-4 py-2 text-sm"
  } ${className}`;

  // Each destination that has a creation flow opens it directly.
  if (pathname === "/") {
    return (
      <button
        type="button"
        onClick={openAdd}
        className={`cursor-pointer ${buttonClass}`}
      >
        <PlusIcon className="h-4 w-4 shrink-0" />
        Add Widgets
      </button>
    );
  }

  if (isActive(pathname, "/collections")) {
    return (
      <button
        type="button"
        onClick={openCreate}
        className={`cursor-pointer ${buttonClass}`}
      >
        <PlusIcon className="h-4 w-4 shrink-0" />
        Add Collection
      </button>
    );
  }

  // The Gallery's action opens the same upload dialog as the page's button.
  if (isActive(pathname, "/gallery")) {
    return (
      <button
        type="button"
        onClick={openUpload}
        className={`cursor-pointer ${buttonClass}`}
      >
        <PlusIcon className="h-4 w-4 shrink-0" />
        Add Memory
      </button>
    );
  }

  // Photo Booth opens its setup screen; the anchor starts a fresh booth by
  // returning to the top of that flow.
  if (isActive(pathname, "/photo-booth")) {
    return (
      <Link
        href="/photo-booth#photo-booth-setup"
        className={`cursor-pointer ${buttonClass}`}
      >
        <PlusIcon className="h-4 w-4" />
        New Photo Booth
      </Link>
    );
  }

  // Anywhere else there is no creation flow, so the action stays visibly
  // unavailable rather than pretending to add anything.
  return (
    <button
      type="button"
      disabled
      title={ADD_MEMORY_HINT}
      className={`${buttonClass} transition-shadow disabled:cursor-not-allowed disabled:opacity-95`}
    >
      <PlusIcon className="h-4 w-4 shrink-0" />
      Add Memory
    </button>
  );
}
