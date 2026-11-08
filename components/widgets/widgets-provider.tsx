"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  SIZE_DIMENSIONS,
  type WidgetKind,
  type WidgetPosition,
  type WidgetRecord,
  type WidgetSize,
} from "@/lib/widgets/catalog";
import {
  DEFAULT_CANVAS_WIDTH,
  boxAt,
  settlePosition,
} from "@/lib/widgets/layout";
import { restoreWidget, sortByZ, withoutWidget } from "@/lib/widgets/list";

/**
 * Client-side widget state.
 *
 * The server is the source of truth: the list is fetched once, and every
 * mutation is validated and stored through `/api/widgets`. Moves are applied
 * optimistically for a responsive drag, then persisted; a failed write rolls
 * the widget back so the canvas never shows a layout the database lacks.
 */

export type WidgetDraft = {
  kind: WidgetKind;
  photoIds: string[];
  text: string;
  date: string;
  size: WidgetSize;
  position?: WidgetPosition;
};

export type WidgetEdits = {
  photoIds?: string[];
  text?: string;
  date?: string;
  size?: WidgetSize;
};

type DialogState =
  | { mode: "add" }
  | { mode: "edit"; widgetId: string }
  | null;

type Result = { ok: boolean; error?: string };

type WidgetsContextValue = {
  widgets: WidgetRecord[];
  status: "loading" | "ready" | "error";
  error: string | null;
  dialog: DialogState;
  canvasWidth: number;
  setCanvasWidth: (width: number) => void;
  openAdd: () => void;
  openEdit: (widgetId: string) => void;
  closeDialog: () => void;
  addWidget: (draft: WidgetDraft) => Promise<Result>;
  editWidget: (id: string, edits: WidgetEdits) => Promise<Result>;
  moveWidget: (id: string, position: WidgetPosition) => void;
  removeWidget: (id: string) => Promise<Result>;
  reorderWidget: (id: string, direction: "forward" | "backward") => void;
  reload: () => void;
};

const WidgetsContext = createContext<WidgetsContextValue | null>(null);

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };

    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // Fall through to the generic message.
  }

  return "Something went wrong saving that widget.";
}

export function WidgetsProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<WidgetRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/widgets", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const data = (await response.json()) as { widgets: WidgetRecord[] };
        setWidgets(sortByZ(data.widgets));
        setStatus("ready");
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setStatus("error");
        setError(
          cause instanceof Error
            ? cause.message
            : "The widget store is unreachable right now.",
        );
      });

    return () => controller.abort();
  }, [reloadToken]);

  const reload = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const openAdd = useCallback(() => setDialog({ mode: "add" }), []);

  const openEdit = useCallback(
    (widgetId: string) => setDialog({ mode: "edit", widgetId }),
    [],
  );

  const closeDialog = useCallback(() => setDialog(null), []);

  const addWidget = useCallback(
    async (draft: WidgetDraft): Promise<Result> => {
      const size = SIZE_DIMENSIONS[draft.size];
      const occupied = widgets.map((widget) =>
        boxAt(widget.config.position, SIZE_DIMENSIONS[widget.config.size]),
      );
      const position = settlePosition(
        draft.position ?? { x: 0, y: 0 },
        size,
        occupied,
        canvasWidth,
      );

      try {
        const response = await fetch("/api/widgets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...draft, position }),
        });

        if (!response.ok) {
          const message = await readError(response);
          setError(message);
          return { ok: false, error: message };
        }

        const data = (await response.json()) as { widget: WidgetRecord };
        setWidgets((current) => sortByZ([...current, data.widget]));
        setError(null);
        setDialog(null);

        return { ok: true };
      } catch {
        const message = "The widget store is unreachable right now.";
        setError(message);
        return { ok: false, error: message };
      }
    },
    [canvasWidth, widgets],
  );

  const editWidget = useCallback(
    async (id: string, edits: WidgetEdits): Promise<Result> => {
      try {
        const response = await fetch(`/api/widgets/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(edits),
        });

        if (!response.ok) {
          const message = await readError(response);
          setError(message);
          return { ok: false, error: message };
        }

        const data = (await response.json()) as { widget: WidgetRecord };
        setWidgets((current) =>
          sortByZ(
            current.map((widget) => (widget.id === id ? data.widget : widget)),
          ),
        );
        setError(null);
        setDialog(null);

        return { ok: true };
      } catch {
        const message = "The widget store is unreachable right now.";
        setError(message);
        return { ok: false, error: message };
      }
    },
    [],
  );

  const moveWidget = useCallback(
    (id: string, position: WidgetPosition) => {
      let previous: WidgetRecord | undefined;

      setWidgets((current) =>
        current.map((widget) => {
          if (widget.id !== id) {
            return widget;
          }

          previous = widget;

          return { ...widget, config: { ...widget.config, position } };
        }),
      );

      void (async () => {
        try {
          const response = await fetch(`/api/widgets/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ position }),
          });

          if (!response.ok) {
            throw new Error(await readError(response));
          }
        } catch {
          setWidgets((current) =>
            current.map((widget) =>
              widget.id === id && previous ? previous : widget,
            ),
          );
          setError("That move could not be saved, so it was undone.");
        }
      })();
    },
    [],
  );

  const removeWidget = useCallback(
    async (id: string): Promise<Result> => {
      const removed = widgets.find((widget) => widget.id === id);

      setWidgets((current) => withoutWidget(current, id));
      setError(null);

      try {
        const response = await fetch(`/api/widgets/${id}`, { method: "DELETE" });

        if (!response.ok && response.status !== 404) {
          throw new Error(await readError(response));
        }

        return { ok: true };
      } catch {
        if (removed) {
          setWidgets((current) => restoreWidget(current, removed));
        }

        const message = "That widget could not be removed.";
        setError(message);

        return { ok: false, error: message };
      }
    },
    [widgets],
  );

  const reorderWidget = useCallback(
    (id: string, direction: "forward" | "backward") => {
      const ordered = sortByZ(widgets);
      const index = ordered.findIndex((widget) => widget.id === id);

      if (index === -1) {
        return;
      }

      const target = direction === "forward" ? index + 1 : index - 1;

      if (target < 0 || target >= ordered.length) {
        return;
      }

      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

      const renumbered = ordered.map((widget, position) => ({
        ...widget,
        config: { ...widget.config, z: position + 1 },
      }));

      setWidgets(renumbered);

      const changed = renumbered.filter((widget) =>
        [renumbered[index].id, renumbered[target].id].includes(widget.id),
      );

      void Promise.all(
        changed.map((widget) =>
          fetch(`/api/widgets/${widget.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ z: widget.config.z }),
          }).catch(() => undefined),
        ),
      );
    },
    [widgets],
  );

  const value = useMemo<WidgetsContextValue>(
    () => ({
      widgets,
      status,
      error,
      dialog,
      canvasWidth,
      setCanvasWidth,
      openAdd,
      openEdit,
      closeDialog,
      addWidget,
      editWidget,
      moveWidget,
      removeWidget,
      reorderWidget,
      reload,
    }),
    [
      widgets,
      status,
      error,
      dialog,
      canvasWidth,
      openAdd,
      openEdit,
      closeDialog,
      addWidget,
      editWidget,
      moveWidget,
      removeWidget,
      reorderWidget,
      reload,
    ],
  );

  return (
    <WidgetsContext.Provider value={value}>{children}</WidgetsContext.Provider>
  );
}

export function useWidgets(): WidgetsContextValue {
  const context = useContext(WidgetsContext);

  if (!context) {
    throw new Error("useWidgets must be used inside <WidgetsProvider>.");
  }

  return context;
}
