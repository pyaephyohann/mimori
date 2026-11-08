/**
 * Hand-drawn navigation icons.
 *
 * Simple stroked shapes with rounded caps, so they sit next to the scrapbook
 * doodles without looking like a separate icon set. All are `aria-hidden` —
 * the label next to them carries the meaning.
 */

type IconProps = {
  className?: string;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...stroke}>
      <path d="M4 10.6 12 4l8 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-3.7v-5.2H9.1v5.2H5.4A1.4 1.4 0 0 1 4 19Z" />
    </svg>
  );
}

export function GalleryIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...stroke}>
      <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="2.6" />
      <circle cx="8.4" cy="9.8" r="1.5" />
      <path d="M4 16.2l4.8-4.4 3.4 3 2.5-2.3 4.9 4.4" />
    </svg>
  );
}

export function FolderIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...stroke}>
      <path d="M3.4 8a2.2 2.2 0 0 1 2.2-2.2h3.2l1.8 2.2h6.2A2.2 2.2 0 0 1 19 10.2v6.4a2.2 2.2 0 0 1-2.2 2.2H5.6A2.2 2.2 0 0 1 3.4 16.6Z" />
      <path d="M12 9.4c.7-.9 2.2-.7 2.2.6 0 .9-1.1 1.6-2.2 2.4-1.1-.8-2.2-1.5-2.2-2.4 0-1.3 1.5-1.5 2.2-.6Z" />
    </svg>
  );
}

export function CameraIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...stroke}>
      <path d="M4.2 9a2.2 2.2 0 0 1 2.2-2.2h1.3L9 4.9h6l1.3 1.9h1.3A2.2 2.2 0 0 1 19.8 9v7.6a2.2 2.2 0 0 1-2.2 2.2H6.4a2.2 2.2 0 0 1-2.2-2.2Z" />
      <circle cx="12" cy="12.6" r="3.1" />
    </svg>
  );
}

export function WidgetIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...stroke}>
      <rect x="3.6" y="3.6" width="6.8" height="6.8" rx="2" />
      <rect x="13.6" y="3.6" width="6.8" height="6.8" rx="2" />
      <rect x="3.6" y="13.6" width="6.8" height="6.8" rx="2" />
      <path d="M17 13.4c.7-.9 2.2-.7 2.2.6 0 .9-1.1 1.6-2.2 2.4-1.1-.8-2.2-1.5-2.2-2.4 0-1.3 1.5-1.5 2.2-.6Z" />
    </svg>
  );
}

export function PlusIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...stroke}>
      <path d="M12 5.4v13.2M5.4 12h13.2" />
    </svg>
  );
}
