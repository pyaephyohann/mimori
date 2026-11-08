"use client";

import { motion, useMotionValue } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { useGalleryPhotos } from "@/components/gallery/gallery-photos-provider";
import { BowSticker, HeartDoodle } from "@/components/scrapbook/doodles";
import { useToast } from "@/components/toast/toast-provider";
import type { Photo } from "@/lib/photo";
import {
  SIZE_DIMENSIONS,
  WIDGET_SIZES,
  type WidgetRecord,
} from "@/lib/widgets/catalog";
import {
  boxAt,
  clampToCanvas,
  contentHeight,
  settlePosition,
} from "@/lib/widgets/layout";

import { useWidgets } from "./widgets-provider";
import { WidgetRenderer } from "./widget-renderer";

/**
 * The widget canvas: widgets sit at their own grid positions directly on the
 * page, with no surrounding panel, so the scrapbook reads as one open canvas
 * between the hero and the gallery.
 *
 * There is no arrange mode. Every widget can be dragged at any time, and its
 * own small handle opens resize / edit / layer / remove. A drag commits once,
 * on release, so the store is not written on every pointer frame.
 */

type PlacedWidgetProps = {
  widget: WidgetRecord;
  canvasWidth: number;
  others: ReturnType<typeof boxAt>[];
  boundsRef: RefObject<HTMLDivElement | null>;
  photos: readonly Photo[];
  onMove: (id: string, box: { x: number; y: number }) => void;
  onResize: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onForward: (id: string) => void;
  onBackward: (id: string) => void;
};

function PlacedWidget({
  widget,
  canvasWidth,
  photos,
  others,
  boundsRef,
  onMove,
  onResize,
  onEdit,
  onRemove,
  onForward,
  onBackward,
}: PlacedWidgetProps) {
  const [dragging, setDragging] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // The drag offset lives in motion values rather than in React state, so a
  // move never re-renders the tree; it is zeroed when the drop is committed.
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const base = SIZE_DIMENSIONS[widget.config.size];
  const width = Math.min(base.width, canvasWidth);
  const scale = width / base.width;
  const height = Math.round(base.height * scale);

  const size = { width, height };

  const position = clampToCanvas(widget.config.position, size, canvasWidth);

  const runTool = (action: () => void) => {
    setToolsOpen(false);
    action();
  };

  return (
    <motion.div
      ref={cardRef}
      role="group"
      aria-label={widget.name}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={boundsRef}
      onDragStart={() => {
        setDragging(true);
        setToolsOpen(false);
      }}
      onDragEnd={(_event, info) => {
        setDragging(false);

        // Measured from the rendered box rather than the stored coordinate:
        // CSS may have pulled the card inside the canvas when the measured
        // width was older than the current layout.
        const originX = cardRef.current?.offsetLeft ?? position.x;
        const originY = cardRef.current?.offsetTop ?? position.y;

        const settled = settlePosition(
          { x: originX + info.offset.x, y: originY + info.offset.y },
          size,
          others,
          canvasWidth,
        );

        // The transform is the visual drag only; the card's new home is the
        // stored coordinate. Resetting now keeps the card from rendering
        // twice its distance from the corner.
        dragX.set(0);
        dragY.set(0);

        if (settled.x !== position.x || settled.y !== position.y) {
          onMove(widget.id, settled);
        }
      }}
      style={{
        x: dragX,
        y: dragY,
        // `min()` keeps the card inside the canvas even before the measured
        // width catches up with a viewport change.
        left: `min(${position.x}px, calc(100% - min(${width}px, 100%)))`,
        top: position.y,
        width: `min(${width}px, 100%)`,
        aspectRatio: `${base.width} / ${base.height}`,
        zIndex: dragging ? 60 : widget.config.z,
        touchAction: "none",
      }}
      className="group absolute cursor-grab active:cursor-grabbing"
    >
      {/* Content never takes pointer events, so a drag can start anywhere on
          the piece and a photo can never swallow the gesture. */}
      <div className="pointer-events-none relative h-full w-full select-none">
        <WidgetRenderer config={widget.config} photos={photos} />
      </div>

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setToolsOpen((open) => !open)}
        aria-expanded={toolsOpen}
        aria-label={`Widget options for ${widget.name}`}
        title="Widget options"
        className="absolute -top-3 -right-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-paper-edge bg-paper text-paper-foreground/70 opacity-70 shadow-sm transition-opacity hover:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
          <g fill="currentColor">
            <circle cx="5" cy="12" r="1.9" />
            <circle cx="12" cy="12" r="1.9" />
            <circle cx="19" cy="12" r="1.9" />
          </g>
        </svg>
      </button>

      {toolsOpen ? (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute -top-3 right-6 z-10 flex items-center gap-0.5 rounded-full border border-paper-edge bg-paper px-1 py-0.5 shadow-sm"
        >
          <ToolButton label="Send backward" onClick={() => runTool(() => onBackward(widget.id))}>
            <path d="M12 19V5M6 11l6 6 6-6" />
          </ToolButton>
          <ToolButton label="Bring forward" onClick={() => runTool(() => onForward(widget.id))}>
            <path d="M12 5v14M6 13l6-6 6 6" />
          </ToolButton>
          <ToolButton label="Change size" onClick={() => runTool(() => onResize(widget.id))}>
            <path d="M4 14v6h6M20 10V4h-6M4 20 10 14M20 4l-6 6" />
          </ToolButton>
          <ToolButton label="Edit widget" onClick={() => runTool(() => onEdit(widget.id))}>
            <path d="M4 20h4l10-10-4-4L4 16v4Z" />
          </ToolButton>
          <ToolButton label="Remove widget" onClick={() => runTool(() => onRemove(widget.id))} danger>
            <path d="M6 6l12 12M18 6 6 18" />
          </ToolButton>
        </div>
      ) : null}
    </motion.div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors ${
        danger
          ? "text-danger hover:bg-danger-surface"
          : "text-paper-foreground/75 hover:bg-blush-pink/70"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </g>
      </svg>
    </button>
  );
}

export function WidgetCanvas() {
  const {
    widgets,
    status,
    error,
    openEdit,
    moveWidget,
    editWidget,
    removeWidget,
    reorderWidget,
    canvasWidth,
    setCanvasWidth,
    reload,
  } = useWidgets();
  // The widgets' photos come from the gallery, so a widget can only show a
  // picture the Gallery holds.
  const { photos } = useGalleryPhotos();
  const { showToast } = useToast();

  // A removal is optimistic in the store, so the outcome is reported only once
  // the server has answered: the canvas and the toast never disagree.
  const remove = useCallback(
    async (id: string) => {
      const result = await removeWidget(id);

      if (result.ok) {
        showToast("Widget removed successfully.");
        return;
      }

      showToast(result.error ?? "That widget could not be removed.", "error");
    },
    [removeWidget, showToast],
  );

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = canvasRef.current;

    if (!element) {
      return;
    }

    const measure = () => setCanvasWidth(element.clientWidth || 1200);
    measure();

    // Two signals because ResizeObserver can be throttled in background or
    // embedded surfaces; `min()` in the card styles is the final safety net.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [setCanvasWidth]);

  const boxes = useMemo(
    () =>
      widgets.map((widget) => {
        const base = SIZE_DIMENSIONS[widget.config.size];
        const width = Math.min(base.width, canvasWidth);
        const height = Math.round(base.height * (width / base.width));
        const position = clampToCanvas(
          widget.config.position,
          { width, height },
          canvasWidth,
        );

        return boxAt(position, { width, height });
      }),
    [widgets, canvasWidth],
  );

  const canvasHeight = useMemo(() => contentHeight(boxes, 220), [boxes]);

  const cycleSize = useCallback(
    (id: string) => {
      const widget = widgets.find((candidate) => candidate.id === id);

      if (!widget) {
        return;
      }

      const index = WIDGET_SIZES.indexOf(widget.config.size);
      const next = WIDGET_SIZES[(index + 1) % WIDGET_SIZES.length];

      void editWidget(id, { size: next });
    },
    [widgets, editWidget],
  );

  return (
    <section aria-label="Pinned widgets" className="relative mt-10 w-full sm:mt-14">
      {error ? (
        <div
          role="status"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger-border bg-danger-surface px-3 py-2 text-xs text-danger"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="cursor-pointer rounded-full bg-paper px-2.5 py-1 font-semibold text-danger"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div
        ref={canvasRef}
        className="relative w-full"
        style={widgets.length > 0 ? { minHeight: canvasHeight } : undefined}
      >
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
            <BowSticker className="text-xl" />
            <p className="text-xs text-warm-charcoal/60">Fetching your little desktop…</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <HeartDoodle className="h-7 w-7 text-warm-charcoal/50" />
            <p className="text-sm text-warm-charcoal/80">
              The widget store could not be reached.
            </p>
            <button
              type="button"
              onClick={reload}
              className="cursor-pointer rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        ) : null}

        {status === "ready" && widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
            <BowSticker className="text-2xl" />
            <p className="font-decorative text-xl text-paper-foreground">
              Nothing here yet
            </p>
            <p className="max-w-xs text-xs text-paper-foreground/60">
              Add your first widget with + Add Widgets.
            </p>
          </div>
        ) : null}

        {status === "ready"
          ? widgets.map((widget, index) => (
              <PlacedWidget
                key={widget.id}
                widget={widget}
                canvasWidth={canvasWidth}
                photos={photos}
                others={boxes.filter((_box, boxIndex) => boxIndex !== index)}
                boundsRef={canvasRef}
                onMove={moveWidget}
                onResize={cycleSize}
                onEdit={openEdit}
                onRemove={remove}
                onForward={(id) => reorderWidget(id, "forward")}
                onBackward={(id) => reorderWidget(id, "backward")}
              />
            ))
          : null}
      </div>
    </section>
  );
}
