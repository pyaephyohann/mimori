"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { HeartDoodle } from "@/components/scrapbook/doodles";
import { useToast } from "@/components/toast/toast-provider";
import {
  BACKGROUNDS,
  backgroundColour,
  type BackgroundKey,
} from "@/lib/photo-booth/backgrounds";
import {
  BORDER_CATALOG,
  getBorderTemplate,
} from "@/lib/photo-booth/borders";
import type { BoothLayout, PhotoCount } from "@/lib/photo-booth/catalog";
import { renderBoothJpeg } from "@/lib/photo-booth/client";
import {
  DEFAULT_BORDER_WIDTH,
  DEFAULT_SPACING,
  MAX_BORDER_WIDTH,
  MAX_SPACING,
  MIN_BORDER_WIDTH,
  MIN_SPACING,
  composeBooth,
} from "@/lib/photo-booth/compose";
import {
  MAX_CAPTION_LENGTH,
  addSticker,
  createStickerId,
  formatBoothDate,
  moveSticker,
  normalizeCaption,
  removeSticker,
  updateSticker,
  type BoothEditorConfig,
} from "@/lib/photo-booth/editor";
import { PRINT_FILE_NAME, downloadBlob } from "@/lib/photo-booth/download";
import {
  boothPrintSignature,
  createBoothSaveCache,
  saveBoothSession,
  updateBoothSession,
  type BoothSaveCache,
  type BoothSaveProgress,
  type SavedBooth,
} from "@/lib/photo-booth/save";
import { shotPhotoSource, type BoothShot } from "@/lib/photo-booth/shots";
import type { StickerKey } from "@/lib/photo-booth/stickers";

import { BorderPreview } from "./border-preview";
import { CompositionPreview } from "./composition-preview";
import { EditorSlider } from "./editor-slider";
import { OptionCard } from "./option-card";
import { SaveBar } from "./save-bar";
import { SavePanel } from "./save-panel";
import { StickerPicker } from "./sticker-picker";

const TABS = [
  { key: "border", label: "Border" },
  { key: "paper", label: "Paper" },
  { key: "stickers", label: "Stickers" },
  { key: "words", label: "Words" },
  { key: "frame", label: "Frame" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type EditorStepProps = {
  photoCount: PhotoCount;
  layout: BoothLayout;
  /**
   * The print's photographs: fresh captures, or the Cloudinary images of a
   * reopened session. The editor only ever reads them.
   */
  photos: readonly BoothShot[];
  config: BoothEditorConfig;
  onChange: (next: BoothEditorConfig) => void;
  onBack: () => void;
  /** Wording for the way back, which differs for a saved session. */
  backLabel: string;
  /** The session already stored on the server, if this print has been saved. */
  session: SavedBooth | null;
  onSaved: (saved: SavedBooth) => void;
  /**
   * Leaves the editor for the Photo Booth library. A reopened booth has to
   * navigate to its own page; a fresh one only has to show the library step.
   */
  onGoToBooth: () => void;
};

function Swatch({
  title,
  color,
  selected,
  onSelect,
}: {
  title: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected
          ? "border-primary bg-blush-pink/50"
          : "border-paper-edge bg-white/70 hover:border-primary/60 hover:bg-blush-pink/30"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-9 w-9 rounded-full border border-black/5 shadow-[inset_0_-2px_6px_rgba(73,52,61,0.08)]"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] leading-tight text-paper-foreground/75">
        {title}
      </span>
    </button>
  );
}

/**
 * The post-capture editor.
 *
 * The left side is the print itself: photos, paper, pattern, decorations,
 * stickers, caption and date, all placed by `composeBooth`. The right side is a
 * five-tab drawer of small choices, so the composition stays the focus instead
 * of a wall of sliders. Every change is a configuration update — the captures
 * are never re-encoded or replaced, which is why changing a border never asks
 * for the camera again.
 */
export function EditorStep({
  photoCount,
  layout,
  photos,
  config,
  onChange,
  onBack,
  backLabel,
  session,
  onSaved,
  onGoToBooth,
}: EditorStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const captionId = `${uid}-caption`;
  const dateId = `${uid}-date`;
  const panelId = `${uid}-panel`;

  const [tab, setTab] = useState<TabKey>("border");
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [rendered, setRendered] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<BoothSaveProgress | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const { showToast } = useToast();

  // A second click can arrive before `saving` has rendered; the ref makes the
  // one-request-per-save rule absolute.
  const saveInFlight = useRef(false);

  // Uploaded captures and the print survive a failed save, so pressing save
  // again continues instead of storing everything twice. A reopened session
  // seeds the cache with its own stored print: an edit that changes nothing
  // reuses that page instead of uploading a duplicate.
  const [cache] = useState<BoothSaveCache>(() =>
    createBoothSaveCache(
      session
        ? {
            signature: boothPrintSignature({
              photoCount,
              layout,
              config,
              shotIds: photos.map((photo) => photo.id),
            }),
            photoId: session.print.id,
          }
        : null,
    ),
  );

  const template = getBorderTemplate(config.borderKey);
  const dateText = config.showDate ? formatBoothDate(config.date) : "";
  const caption = config.caption.trim();
  const background = backgroundColour(config.backgroundKey);
  // A capture is drawn from its Blob; a saved photo is loaded from Cloudinary.
  const photoSources = photos.map(shotPhotoSource);

  const geometry = useMemo(
    () =>
      composeBooth({
        photoCount,
        layout,
        borderKey: config.borderKey,
        borderWidth: config.borderWidth,
        spacing: config.spacing,
        caption: caption.length > 0 || dateText.length > 0,
        background: background ?? undefined,
        stickers: config.stickers,
      }),
    [
      background,
      caption,
      config.borderKey,
      config.borderWidth,
      config.spacing,
      config.stickers,
      dateText,
      layout,
      photoCount,
    ],
  );

  // The exported JPEG is an object URL; release it when it is replaced or the
  // editor goes away.
  useEffect(() => {
    if (!rendered) {
      return;
    }

    return () => URL.revokeObjectURL(rendered);
  }, [rendered]);

  // A removed sticker simply stops being selected; no effect is needed.
  const activeStickerId =
    selectedSticker &&
    config.stickers.some((sticker) => sticker.id === selectedSticker)
      ? selectedSticker
      : null;

  const patch = (next: Partial<BoothEditorConfig>) => {
    onChange({ ...config, ...next });
  };

  const addStickerToPrint = (sticker: StickerKey) => {
    const next = addSticker(config, sticker, createStickerId());

    if (next === config) {
      return;
    }

    onChange(next);
    setSelectedSticker(next.stickers[next.stickers.length - 1].id);
  };

  const finish = async () => {
    setFinishing(true);
    setFinishError(null);
    setSaveError(null);
    setProgress(null);

    try {
      const blob = await renderBoothJpeg({
        geometry,
        template,
        photos: photoSources,
        caption,
        date: dateText,
      });

      setRenderedBlob(blob);
      setRendered(URL.createObjectURL(blob));
    } catch (error) {
      setFinishError(
        error instanceof Error
          ? error.message
          : "The print could not be rendered. Try again.",
      );
    } finally {
      setFinishing(false);
    }
  };

  /**
   * Uploads what is new, then saves the session.
   *
   * A new print uploads its captures and its page; editing a saved one uploads
   * only the replacement page, because the originals already exist and belong
   * to that session. Nothing is cleared afterwards: a failure leaves every Blob
   * and the whole configuration in place, and the finished panel offers to try
   * again.
   */
  const save = async () => {
    if (saveInFlight.current || saving || !renderedBlob) {
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    setProgress(null);

    try {
      const result = session
        ? await updateBoothSession({
            sessionId: session.sessionId,
            photoCount,
            layout,
            shotIds: photos.map((photo) => photo.id),
            config,
            print: renderedBlob,
            cache,
            onProgress: setProgress,
          })
        : await saveBoothSession({
            photoCount,
            layout,
            config,
            shots: photos.flatMap((photo) =>
              photo.source === "capture"
                ? [{ id: photo.id, blob: photo.blob }]
                : [],
            ),
            print: renderedBlob,
            cache,
            onProgress: setProgress,
          });

      onSaved(result);
      setJustSaved(true);
      router.refresh();
      showToast(
        session
          ? "Photo Booth updated successfully."
          : "Photo Booth saved successfully.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Your photobooth could not be saved. Try again.";

      setSaveError(message);
      showToast(message, "error");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  /**
   * Downloads the current composition.
   *
   * Renders from the settings on screen, not from the stored print, so a
   * download taken after an unsaved border change is the page the visitor is
   * looking at.
   */
  const download = async () => {
    if (downloading || finishing) {
      return;
    }

    setDownloading(true);
    setFinishError(null);

    try {
      const blob = await renderBoothJpeg({
        geometry,
        template,
        photos: photoSources,
        caption,
        date: dateText,
      });

      downloadBlob(blob, PRINT_FILE_NAME);
    } catch (error) {
      setFinishError(
        error instanceof Error
          ? error.message
          : "Your print could not be prepared for download. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Downloads the print the session stored.
   *
   * The finished panel shows the saved page, so the file comes from that page
   * rather than from a fresh render: what is downloaded is exactly what the
   * Photo Booth now holds.
   */
  const downloadSavedPrint = async () => {
    if (downloading || !session) {
      return;
    }

    setDownloading(true);
    setSaveError(null);

    try {
      const response = await fetch(session.print.src);

      if (!response.ok) {
        throw new Error("The saved print could not be fetched.");
      }

      downloadBlob(await response.blob(), PRINT_FILE_NAME);
    } catch {
      setSaveError("The saved print could not be downloaded. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  /** The panel's download follows what the panel is showing. */
  const downloadShownPrint = () =>
    justSaved && session ? downloadSavedPrint() : download();

  const backToEditing = () => {
    setRendered(null);
    setRenderedBlob(null);
    setSaveError(null);
    setProgress(null);
    setJustSaved(false);
  };

  const printUrl = justSaved && session ? session.print.src : rendered;
  const showFinished = printUrl !== null;

  return (
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <section className="rounded-[26px] border border-paper-edge bg-paper p-4 shadow-[0_20px_46px_-34px_rgba(73,52,61,0.9)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-paper-foreground/45 uppercase">
              {session ? "A Day to Remember" : "Step four · Editor"}
            </p>
            <h2 className="mt-1 flex items-center gap-1.5 font-decorative text-2xl leading-tight text-paper-foreground sm:text-3xl">
              {session ? (
                <>Our Little Memories ❤️</>
              ) : (
                <>
                  Make it yours
                  <HeartDoodle filled className="h-4 w-4 text-candy-pink" />
                </>
              )}
            </h2>
            <p className="mt-1 max-w-md text-xs text-paper-foreground/65">
              {session
                ? "Little moments, captured together."
                : "Swap the paper, add stickers and write a little note. Your photos stay exactly as you took them."}
            </p>
          </div>

          <span className="rounded-full bg-blush-pink px-3 py-1 text-[11px] font-medium text-paper-foreground">
            {photoCount} photos ·{" "}
            {layout === "strip" ? "Vertical strip" : "Square collage"}
          </span>
        </div>

        {showFinished && printUrl ? (
          <SavePanel
            printUrl={printUrl}
            aspectRatio={`${geometry.width} / ${geometry.height}`}
            saving={saving}
            downloading={downloading}
            progress={progress}
            error={saveError}
            saved={justSaved}
            updating={session !== null}
            onSave={() => void save()}
            onDownload={() => void downloadShownPrint()}
            onBackToEditing={backToEditing}
            onBackToReview={onBack}
            onGoToBooth={onGoToBooth}
            backLabel={backLabel}
          />
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl bg-blush-pink/35 p-3 ring-1 ring-paper-edge sm:p-5">
                <div className="mx-auto w-full max-w-[24rem]">
                  <CompositionPreview
                    geometry={geometry}
                    template={template}
                    photos={photos}
                    caption={caption}
                    date={dateText}
                    selectedStickerId={activeStickerId}
                    onSelectSticker={setSelectedSticker}
                    onMoveSticker={(id, x, y) =>
                      onChange(moveSticker(config, id, x, y))
                    }
                    label={`Your photobooth print, ${photoCount} photos, ${template.title}`}
                  />
                </div>

                {config.stickers.length > 0 ? (
                  <p className="mt-3 text-center text-[11px] text-paper-foreground/60">
                    Drag a sticker to move it · arrow keys nudge it
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <div
                role="tablist"
                aria-label="Editor sections"
                className="flex flex-wrap gap-1 rounded-full bg-blush-pink/40 p-1"
              >
                {TABS.map((entry) => {
                  const selected = tab === entry.key;

                  return (
                    <button
                      key={entry.key}
                      type="button"
                      role="tab"
                      id={`${uid}-tab-${entry.key}`}
                      aria-selected={selected}
                      aria-controls={panelId}
                      onClick={() => setTab(entry.key)}
                      className={`shrink-0 cursor-pointer rounded-full px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        selected
                          ? "bg-paper text-deep-candy-pink shadow-sm"
                          : "text-paper-foreground/65 hover:text-paper-foreground"
                      }`}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                id={panelId}
                aria-labelledby={`${uid}-tab-${tab}`}
                className="mt-3"
              >
                {/* Keyed rather than `AnimatePresence`: the panel swaps at
                    once, so a paused exit animation can never leave the tab
                    showing the wrong controls. */}
                <motion.div
                  key={tab}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                >
                    {tab === "border" ? (
                      <div>
                        <p className="text-xs leading-relaxed text-paper-foreground/70">
                          Change the paper anytime — your photos are not
                          retaken.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          {BORDER_CATALOG.map((border) => (
                            <OptionCard
                              key={border.key}
                              selected={config.borderKey === border.key}
                              onSelect={() => patch({ borderKey: border.key })}
                              title={border.title}
                              previewClassName="h-24"
                              preview={
                                <BorderPreview
                                  borderKey={border.key}
                                  photoCount={photoCount}
                                  layout={layout}
                                />
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {tab === "paper" ? (
                      <div>
                        <p className="text-xs leading-relaxed text-paper-foreground/70">
                          Repaint the frame. The border&apos;s pattern,
                          decorations and caption paper stay put.
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2.5">
                          <Swatch
                            title="Border paper"
                            color={template.frame}
                            selected={config.backgroundKey === null}
                            onSelect={() => patch({ backgroundKey: null })}
                          />
                          {BACKGROUNDS.map((background) => (
                            <Swatch
                              key={background.key}
                              title={background.title}
                              color={background.color}
                              selected={config.backgroundKey === background.key}
                              onSelect={() =>
                                patch({
                                  backgroundKey:
                                    background.key as BackgroundKey,
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {tab === "stickers" ? (
                      <StickerPicker
                        stickers={config.stickers}
                        selectedId={activeStickerId}
                        onSelect={setSelectedSticker}
                        onAdd={addStickerToPrint}
                        onRemove={(id) => {
                          onChange(removeSticker(config, id));

                          if (selectedSticker === id) {
                            setSelectedSticker(null);
                          }
                        }}
                        onResize={(id, size) =>
                          onChange(updateSticker(config, id, { size }))
                        }
                        onRotate={(id, rotate) =>
                          onChange(updateSticker(config, id, { rotate }))
                        }
                      />
                    ) : null}

                    {tab === "words" ? (
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor={captionId}
                            className="text-[10px] tracking-[0.18em] text-paper-foreground/55 uppercase"
                          >
                            Caption
                          </label>
                          <input
                            id={captionId}
                            type="text"
                            value={config.caption}
                            maxLength={MAX_CAPTION_LENGTH}
                            placeholder="Our Little Moments"
                            onChange={(event) =>
                              patch({
                                caption: normalizeCaption(event.target.value),
                              })
                            }
                            className="mt-1.5 w-full rounded-xl border border-paper-edge bg-white px-3 py-2 text-sm text-paper-foreground outline-none transition-colors focus:border-primary"
                          />
                          <p className="mt-1 flex items-center justify-between text-[11px] text-paper-foreground/50">
                            <span>Leave it empty to print no caption.</span>
                            <span className="tabular-nums">
                              {config.caption.length}/{MAX_CAPTION_LENGTH}
                            </span>
                          </p>
                        </div>

                        <div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={config.showDate}
                            onClick={() => patch({ showDate: !config.showDate })}
                            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-paper-edge bg-white/80 px-3 py-2 text-left transition-colors hover:bg-blush-pink/30"
                          >
                            <span className="text-sm font-medium text-paper-foreground">
                              Date on the print
                            </span>
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                                config.showDate ? "bg-primary" : "bg-paper-edge"
                              }`}
                            >
                              <span
                                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                  config.showDate ? "translate-x-4" : ""
                                }`}
                              />
                            </span>
                          </button>

                          <label
                            htmlFor={dateId}
                            className="mt-3 block text-[10px] tracking-[0.18em] text-paper-foreground/55 uppercase"
                          >
                            Which date?
                          </label>
                          <input
                            id={dateId}
                            type="date"
                            value={config.date}
                            disabled={!config.showDate}
                            onChange={(event) =>
                              patch({ date: event.target.value })
                            }
                            className="mt-1.5 w-full rounded-xl border border-paper-edge bg-white px-3 py-2 text-sm text-paper-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
                          />
                          <p className="mt-1 text-[11px] text-paper-foreground/50">
                            Prints as{" "}
                            <span className="text-paper-foreground/75">
                              {formatBoothDate(config.date) || "—"}
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {tab === "frame" ? (
                      <div className="space-y-4">
                        <p className="text-xs leading-relaxed text-paper-foreground/70">
                          Give the photos a little more room, or the paper a
                          chunkier edge.
                        </p>

                        <div className="space-y-2 rounded-xl border border-paper-edge bg-white/70 p-3">
                          <EditorSlider
                            label="Spacing"
                            value={config.spacing}
                            min={MIN_SPACING}
                            max={MAX_SPACING}
                            step={2}
                            display={`${config.spacing}`}
                            onChange={(spacing) => patch({ spacing })}
                          />
                          <EditorSlider
                            label="Border"
                            value={config.borderWidth}
                            min={MIN_BORDER_WIDTH}
                            max={MAX_BORDER_WIDTH}
                            step={4}
                            display={`${config.borderWidth}`}
                            onChange={(borderWidth) => patch({ borderWidth })}
                          />

                          <p className="pt-1 text-[11px] text-paper-foreground/50">
                            Spacing sets the gap between photos. Border sets the
                            frame around them.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            patch({
                              spacing: DEFAULT_SPACING,
                              borderWidth: DEFAULT_BORDER_WIDTH,
                            })
                          }
                          className="cursor-pointer rounded-full border border-paper-edge px-3 py-1.5 text-[11px] font-medium text-paper-foreground transition-colors hover:bg-blush-pink/60"
                        >
                          Reset frame
                        </button>
                      </div>
                    ) : null}
                </motion.div>
              </div>

              <SaveBar
                onBack={onBack}
                backLabel={backLabel}
                onFinish={() => void finish()}
                onDownload={() => void download()}
                busy={finishing}
                downloading={downloading}
                error={finishError}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
