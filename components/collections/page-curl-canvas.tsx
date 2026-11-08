"use client";

import { useImperativeHandle, useLayoutEffect, useRef, forwardRef } from "react";

import type { Photo } from "@/lib/photo";

/**
 * The turning sheet, drawn as one continuous curled surface on a single
 * canvas instead of a chain of DOM strips. Each frame the sheet is sliced
 * into ~70 vertical ribbons sampled from two offscreen page textures
 * (front print + back print) and re-projected along a curl curve:
 * the spine edge turns with the overall progress while the free edge
 * trails behind it, so the sheet bends hardest mid-turn and lies flat at
 * both ends. Because every ribbon lands on the same 2D bitmap there are
 * no overlapping 3D faces, hence no z-fighting seams or black joint lines.
 *
 * The parent drives this imperatively (`draw(progress, grabY)`) from its
 * own rAF loop so pointer drags don't re-render React at 60fps.
 */

export type CurlHandle = {
  /** progress: 0 = sheet flat on the right, 1 = flat on the left. */
  draw: (progress: number, grabY: number) => void;
  /** Removes the sheet without touching its textures, ready for the next turn. */
  clear: () => void;
};

type Props = {
  front: Photo | undefined;
  back: Photo | undefined;
  frontSide: "right" | "left";
  frontNumber: string;
  backNumber: string;
  pageWidth: number;
  pageHeight: number;
  /** Which way the sheet turns: 1 = right→left, -1 = left→right. */
  direction: 1 | -1;
};

const SLICES = 72;
/** How far the free edge lags the spine edge at mid-turn, in radians. */
const PEAK_BEND = (38 * Math.PI) / 180;
const BEND_PROFILE = 1.3;

type FaceTexture = {
  canvas: HTMLCanvasElement;
  ready: boolean;
};

/** One sampled ribbon of the sheet, before anything is painted. */
type Slice = {
  /** The ribbon's spine-side edge, in book CSS px. */
  x0: number;
  /** How far this ribbon has turned: 0 flat, PI fully turned. */
  ang: number;
  /** Position along the sheet, 0 at the spine, 1 at the free edge. */
  u: number;
  /** Cumulative depth out of the page at this ribbon, for perspective. */
  depth: number;
};

function makeTexture(w: number, h: number): FaceTexture {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return { canvas, ready: false };
}

type PageImage = {
  img: HTMLImageElement | null;
  status: "loading" | "ready" | "failed";
  listeners: Set<() => void>;
};

/**
 * Decoded page photos, shared by every sheet in the book.
 *
 * Without this cache each turn fetched and decoded its two photos again, and
 * the sheet showed bright blank paper until they arrived — a visible flash of
 * white at the start of the turn, and a second jump when the photo landed. The
 * book preloads the pages around the spread, so a turn starts with finished
 * faces.
 */
const pageImages = new Map<string, PageImage>();

function pageImage(src: string): PageImage {
  const cached = pageImages.get(src);

  if (cached) {
    return cached;
  }

  const entry: PageImage = { img: null, status: "loading", listeners: new Set() };
  pageImages.set(src, entry);

  const img = new Image();
  img.crossOrigin = "anonymous";
  const settle = (status: PageImage["status"]) => {
    entry.status = status;
    entry.img = status === "ready" ? img : null;
    const waiting = [...entry.listeners];
    entry.listeners.clear();
    waiting.forEach((listener) => listener());
  };
  img.onload = () => settle("ready");
  img.onerror = () => settle("failed"); // paper instead of a photo, never broken
  img.src = src;

  return entry;
}

/**
 * Loads page photos ahead of a turn.
 *
 * The book calls this for the pages around the current spread, so pressing an
 * arrow finds the images already decoded and the sheet's first frame is a
 * finished page rather than paper.
 */
export function preloadPageImages(sources: readonly (string | undefined)[]): void {
  if (typeof window === "undefined") {
    return;
  }

  sources.forEach((src) => {
    if (src) {
      pageImage(src);
    }
  });
}

/** What a pair of page textures was painted from, so a sheet can tell whether
 *  its bitmaps still describe the props it is being asked to draw. */
function sheetKey(
  front: Photo | undefined,
  back: Photo | undefined,
  frontSide: "right" | "left",
  numbers: { frontNumber: string; backNumber: string },
  w: number,
  h: number,
): string {
  return [
    front?.id ?? "-",
    back?.id ?? "-",
    frontSide,
    numbers.frontNumber,
    numbers.backNumber,
    w,
    h,
  ].join("|");
}

function paintPaper(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  photo: Photo | undefined,
  img: HTMLImageElement | null,
  side: "right" | "left",
  pageNumber: string,
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#FCF5F7";
  ctx.fillRect(0, 0, w, h);

  // Soft top-light gradient, matching the DOM page's radial wash.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, "rgba(255,255,255,0.85)");
  wash.addColorStop(0.55, "rgba(255,255,255,0)");
  wash.addColorStop(1, "rgba(249,225,234,0.35)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  if (photo && img) {
    const padX = w * 0.08;
    const top = h * 0.08;
    const bottom = h * 0.82;
    const boxW = w - padX * 2;
    const boxH = bottom - top;
    const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = padX + (boxW - dw) / 2;
    const dy = top + (boxH - dh) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(73,52,61,0.35)";
    ctx.shadowBlur = Math.max(6, w * 0.04);
    ctx.shadowOffsetY = Math.max(3, w * 0.02);
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    const caption = photo.caption.trim();
    if (caption) {
      ctx.fillStyle = "rgba(90,60,70,0.85)";
      ctx.font = `${Math.max(11, w * 0.052)}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(caption.slice(0, 64), w / 2, h * 0.9, w * 0.84);
    }
  } else if (!photo) {
    ctx.fillStyle = "rgba(120,85,95,0.5)";
    ctx.font = `${Math.max(20, w * 0.1)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♡", w / 2, h * 0.44);
    ctx.font = `${Math.max(11, w * 0.05)}px Georgia, serif`;
    ctx.fillText("The end", w / 2, h * 0.54);
  }

  if (pageNumber) {
    ctx.fillStyle = "rgba(90,60,70,0.4)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = side === "left" ? "left" : "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(pageNumber, side === "left" ? w * 0.08 : w * 0.92, h * 0.975);
  }
  ctx.restore();
}

const PageCurlCanvas = forwardRef<CurlHandle, Props>(function PageCurlCanvas(
  { front, back, frontSide, frontNumber, backNumber, pageWidth, pageHeight, direction },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frontTex = useRef<FaceTexture | null>(null);
  const backTex = useRef<FaceTexture | null>(null);
  /** The sheet the current bitmaps were painted from. */
  const builtKey = useRef("");
  /** The frame already on the canvas; empty means nothing is drawn. */
  const lastDraw = useRef("");

  const numbers = useRef({ frontNumber, backNumber });
  numbers.current = { frontNumber, backNumber };

  const scale = useRef(1);
  scale.current =
    typeof window === "undefined"
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);

  const state = useRef({ front, back, frontSide, direction, key: "" });

  state.current = {
    front,
    back,
    frontSide,
    direction,
    key: sheetKey(
      front,
      back,
      frontSide,
      numbers.current,
      Math.max(1, Math.round(pageWidth * scale.current)),
      Math.max(1, Math.round(pageHeight * scale.current)),
    ),
  };

  /**
   * Paints both faces of the sheet.
   *
   * This is a layout effect, not a passive one: the parent draws the opening
   * frame of a turn from its own layout effect, and a passive texture build
   * would run after that, leaving one frame of blank paper — the brightness
   * flash. A sheet whose bitmaps already describe these two pages is left
   * alone, so a forward turn after a spread change paints nothing at all.
   */
  useLayoutEffect(() => {
    const s = scale.current;
    const w = Math.max(1, Math.round(pageWidth * s));
    const h = Math.max(1, Math.round(pageHeight * s));

    if (!frontTex.current) frontTex.current = makeTexture(w, h);
    if (!backTex.current) backTex.current = makeTexture(w, h);

    const ft = frontTex.current;
    const bt = backTex.current;
    const key = sheetKey(front, back, frontSide, numbers.current, w, h);

    if (ft.canvas.width !== w || ft.canvas.height !== h) {
      ft.canvas.width = w;
      ft.canvas.height = h;
    }

    if (bt.canvas.width !== w || bt.canvas.height !== h) {
      bt.canvas.width = w;
      bt.canvas.height = h;
    }

    let cancelled = false;
    const release: Array<() => void> = [];

    const repaint = () => {
      if (cancelled) return;

      const frontSource = front?.src ? pageImage(front.src) : null;
      const backSource = back?.src ? pageImage(back.src) : null;

      // Wait for both photos. Paper now and the photo swapped in mid-turn is
      // exactly the flash this avoids; `draw` skips an unbuilt sheet instead.
      if (
        frontSource?.status === "loading" ||
        backSource?.status === "loading"
      ) {
        return;
      }

      const fctx = ft.canvas.getContext("2d");
      const bctx = bt.canvas.getContext("2d");

      if (fctx) {
        paintPaper(
          fctx,
          w,
          h,
          front,
          frontSource?.status === "ready" ? frontSource.img : null,
          frontSide,
          numbers.current.frontNumber,
        );
      }

      if (bctx) {
        paintPaper(
          bctx,
          w,
          h,
          back,
          backSource?.status === "ready" ? backSource.img : null,
          frontSide === "right" ? "left" : "right",
          numbers.current.backNumber,
        );
      }

      ft.ready = Boolean(fctx);
      bt.ready = Boolean(bctx);
      builtKey.current = key;
      lastDraw.current = ""; // the next draw must use these pixels
    };

    // A photo that arrives later completes the same sheet once, before the
    // sheet is ever shown — never as a frame of paper mid-turn.
    [
      front?.src ? pageImage(front.src) : null,
      back?.src ? pageImage(back.src) : null,
    ].forEach((entry) => {
      if (entry && entry.status === "loading") {
        entry.listeners.add(repaint);
        release.push(() => entry.listeners.delete(repaint));
      }
    });

    repaint();

    return () => {
      cancelled = true;
      release.forEach((stop) => stop());
    };
  }, [front, back, frontSide, frontNumber, backNumber, pageWidth, pageHeight]);

  useImperativeHandle(ref, () => ({
    draw(progress: number, grabY: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const p = Math.min(1, Math.max(0, progress));
      const s = scale.current;
      const W = pageWidth;
      const H = pageHeight;
      const bookW = W * 2;

      if (canvas.width !== Math.round(bookW * s)) {
        canvas.width = Math.round(bookW * s);
        canvas.height = Math.round(H * s);
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      const frame = `${state.current.key}|${p.toFixed(5)}|${grabY.toFixed(4)}`;

      if (frame === lastDraw.current) {
        return;
      }

      const ft = frontTex.current;
      const bt = backTex.current;

      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, bookW, H);

      // A sheet whose pages are still being decoded, or whose bitmaps describe
      // a different spread, is left off the canvas entirely. Showing paper
      // first and swapping the photo in would flash; nothing appears until the
      // faces are finished, and they are preloaded before a turn begins.
      if (!ft || !bt || !ft.ready || !bt.ready || builtKey.current !== state.current.key) {
        lastDraw.current = "";
        return;
      }

      lastDraw.current = frame;

      const dir = state.current.direction;
      // Rigid rotation of the sheet: 0 is flat on the right showing the
      // printed front, PI is flat on the left showing the back. Forward
      // turns run 0 → PI, backward turns run PI → 0 as progress runs 1 → 0.
      // The hinge stays on the spine; the free edge sweeps across the book.
      const sweep = Math.PI * p;
      const bend = PEAK_BEND * Math.sin(Math.PI * p);
      const spineX = W; // book center in CSS px

      // Walk the sheet spine→free edge once without painting: where the free
      // edge lands decides where the cast shadow falls, and the shadow has to
      // be laid down before the sheet so the paper never shades itself.
      let x = spineX;
      let z = 0;
      let minX = spineX;
      let maxX = spineX;
      const sliceSrcW = W / SLICES;
      const lift = Math.sin(Math.PI * p);
      const slices: Slice[] = [];

      for (let i = 0; i < SLICES; i++) {
        const u = (i + 0.5) / SLICES;
        const ang = sweep - bend * Math.pow(u, BEND_PROFILE);
        const x0 = x;
        x += sliceSrcW * Math.cos(ang);
        z += sliceSrcW * Math.sin(ang);
        minX = Math.min(minX, x0, x);
        maxX = Math.max(maxX, x0, x);
        slices.push({ x0, ang, u, depth: z });
      }

      const freeX = x;

      // Contact shadow the sheet throws on the paper below, cast from the
      // free edge outward. It fades in over a few pixels rather than starting
      // at full strength, and it is painted first, so it can only ever fall on
      // the page underneath -- never as a dark seam along the turning paper.
      if (lift > 0.01) {
        const span = Math.max(
          1,
          Math.min(W, dir === 1 ? 2 * W - freeX : freeX),
        );
        const alpha = (0.32 * lift).toFixed(3);
        const grad = ctx.createLinearGradient(
          freeX,
          0,
          freeX + (dir === 1 ? span : -span),
          0,
        );
        grad.addColorStop(0, "rgba(73,52,61,0)");
        grad.addColorStop(Math.min(0.12, 10 / span), `rgba(73,52,61,${alpha})`);
        grad.addColorStop(1, "rgba(73,52,61,0)");
        ctx.fillStyle = grad;
        if (dir === 1) ctx.fillRect(freeX, 0, span, H);
        else ctx.fillRect(freeX - span, 0, span, H);
      }

      for (let i = 0; i < SLICES; i++) {
        const { x0, ang, u, depth } = slices[i];
        const cosA = Math.cos(ang);
        // The printed front faces the viewer while the sheet leans right of
        // edge-on; the back takes over once it has turned past edge-on.
        const showFront = cosA >= 0;
        const dx = sliceSrcW * cosA;

        const tex = showFront ? ft.canvas : bt.canvas;
        // Source column mirrors when viewing the back of the sheet.
        const sx = showFront ? i * sliceSrcW * s : (SLICES - 1 - i) * sliceSrcW * s;

        // Subtle perspective: lifted paper reads slightly smaller, and a
        // corner grab skews the sheet toward the finger.
        const depthK = Math.min(0.06, (depth / Math.max(1, W)) * 0.06);
        const ySkew =
          (grabY - 0.5) * lift * Math.pow(u, 2) * H * 0.1;
        const overlap = Math.min(0.75, Math.max(0.2, Math.abs(dx) * 0.25));
        const dw = Math.abs(dx) + overlap; // hairline overlap: same bitmap, no seam
        const destX = dx >= 0 ? x0 : x0 + dx - overlap / 2;
        const dh = H * (1 - depthK);
        const dy = ((H - dh) / 2) + ySkew * 0.5;

        if (dw < 0.02) continue;
        ctx.drawImage(
          tex,
          sx,
          0,
          sliceSrcW * s + 0.5,
          tex.height,
          destX,
          dy,
          dw,
          dh,
        );

        // Light follows the ribbon's own angle: brightest flat, dimmest
        // edge-on, with a sheen grazing the fold. Each tone covers exactly the
        // rect its ribbon just painted -- the next ribbon's opaque copy erases
        // the overlap and repaints it -- so no column is ever left unshaded (a
        // light hairline) or shaded twice (a dark one) along a ribbon edge.
        const dark = 0.34 * (1 - (0.72 + 0.28 * cosA));
        if (dark > 0.004) {
          ctx.fillStyle = `rgba(73,52,61,${Math.min(0.5, dark).toFixed(3)})`;
          ctx.fillRect(destX, dy, dw, dh);
        }
        const sheen = 0.1 * Math.exp(-Math.pow((ang * 57.3 - 74) / 20, 2));
        if (sheen > 0.004) {
          ctx.fillStyle = `rgba(255,255,255,${sheen.toFixed(3)})`;
          ctx.fillRect(destX, dy, dw, dh);
        }
      }

      // Cut edge of the paper, drawn only while the free edge really is the
      // sheet's outline. Past edge-on the sheet folds back on itself, so the
      // back of the paper is what shows beyond the free edge -- a cut-edge
      // line there would be a painted stripe across the turning page.
      const edgeIsOutline =
        Math.abs(freeX - minX) < 0.5 || Math.abs(freeX - maxX) < 0.5;
      if (edgeIsOutline && lift > 0.72) {
        const edge = 0.45 * ((lift - 0.72) / 0.28);
        ctx.fillStyle = `rgba(255,247,250,${edge.toFixed(3)})`;
        ctx.fillRect(freeX - 0.25, 0, 0.5, H);
      }
    },

    clear() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lastDraw.current = "";
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ width: pageWidth * 2, height: pageHeight }}
    />
  );
});

export default PageCurlCanvas;
