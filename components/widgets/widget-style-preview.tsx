import type { Photo } from "@/lib/photo";
import {
  getCatalogEntry,
  type WidgetConfig,
  type WidgetKind,
} from "@/lib/widgets/catalog";

import { WidgetRenderer } from "./widget-renderer";

function sampleConfig(kind: WidgetKind, photos: readonly Photo[]): WidgetConfig {
  const entry = getCatalogEntry(kind);

  return {
    kind,
    photoIds: photos.slice(0, entry.maxPhotos).map((photo) => photo.id),
    text: entry.defaultText ?? "",
    date: "2024-02-14",
    position: { x: 0, y: 0 },
    size: entry.defaultSize,
    z: 1,
  };
}

/**
 * Miniature of a widget style, used by the style picker.
 *
 * Photo styles preview with the first real gallery photos. With an empty
 * gallery they fall back to the renderer's own empty state rather than to a
 * bundled sample picture.
 */
export function WidgetStylePreview({
  kind,
  photos,
}: {
  kind: WidgetKind;
  photos: readonly Photo[];
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative h-36 w-full overflow-hidden rounded-2xl bg-blush-pink/70 p-2 ring-1 ring-paper-edge"
    >
      <div className="relative h-full w-full">
        <WidgetRenderer config={sampleConfig(kind, photos)} photos={photos} />
      </div>
    </div>
  );
}
