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

import type { Collection } from "@/lib/collections/catalog";

/**
 * Client-side collection state.
 *
 * The server is the source of truth: the list is fetched once and every
 * mutation goes through `/api/collections`, which validates it again. Responses
 * replace the affected collection in place, so pinning, renaming or moving a
 * photo updates the page without a full reload.
 */

export type CollectionDraft = {
  name: string;
  description?: string;
  coverPhotoId?: string | null;
  photoIds?: string[];
};

export type CollectionPatch = {
  name?: string;
  description?: string | null;
  pinned?: boolean;
  coverPhotoId?: string | null;
  photoIds?: string[];
  addPhotoIds?: string[];
  removePhotoIds?: string[];
};

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; collectionId: string }
  | null;

export type CollectionsResult = {
  ok: boolean;
  error?: string;
  collection?: Collection;
};

type CollectionsContextValue = {
  collections: Collection[];
  status: "loading" | "ready" | "error";
  error: string | null;
  dialog: DialogState;
  openCreate: () => void;
  openEdit: (collectionId: string) => void;
  closeDialog: () => void;
  createCollection: (draft: CollectionDraft) => Promise<CollectionsResult>;
  updateCollection: (
    id: string,
    patch: CollectionPatch,
  ) => Promise<CollectionsResult>;
  removeCollection: (id: string) => Promise<CollectionsResult>;
  movePhotos: (input: {
    fromId: string | null;
    toId: string | null;
    photoIds: string[];
  }) => Promise<CollectionsResult>;
  reload: () => void;
};

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };

    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // Fall through to the generic message.
  }

  return "Something went wrong saving that collection.";
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/collections", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const data = (await response.json()) as { collections: Collection[] };
        setCollections(data.collections);
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
            : "Collections are unreachable right now.",
        );
      });

    return () => controller.abort();
  }, [reloadToken]);

  const reload = useCallback(() => {
    setStatus("loading");
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const apply = useCallback((collection: Collection) => {
    setCollections((current) =>
      current.some((candidate) => candidate.id === collection.id)
        ? current.map((candidate) =>
            candidate.id === collection.id ? collection : candidate,
          )
        : [...current, collection],
    );
  }, []);

  const openCreate = useCallback(() => setDialog({ mode: "create" }), []);
  const openEdit = useCallback(
    (collectionId: string) => setDialog({ mode: "edit", collectionId }),
    [],
  );
  const closeDialog = useCallback(() => setDialog(null), []);

  const createCollection = useCallback(
    async (draft: CollectionDraft): Promise<CollectionsResult> => {
      try {
        const response = await fetch("/api/collections", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        });

        if (!response.ok) {
          return { ok: false, error: await readError(response) };
        }

        const data = (await response.json()) as { collection: Collection };
        apply(data.collection);
        setError(null);
        setDialog(null);

        return { ok: true, collection: data.collection };
      } catch {
        return {
          ok: false,
          error: "Collections are unreachable right now.",
        };
      }
    },
    [apply],
  );

  const updateCollection = useCallback(
    async (id: string, patch: CollectionPatch): Promise<CollectionsResult> => {
      try {
        const response = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });

        if (!response.ok) {
          return { ok: false, error: await readError(response) };
        }

        const data = (await response.json()) as { collection: Collection };
        apply(data.collection);
        setError(null);

        return { ok: true, collection: data.collection };
      } catch {
        return {
          ok: false,
          error: "Collections are unreachable right now.",
        };
      }
    },
    [apply],
  );

  const removeCollection = useCallback(
    async (id: string): Promise<CollectionsResult> => {
      try {
        const response = await fetch(`/api/collections/${id}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 404) {
          return { ok: false, error: await readError(response) };
        }

        setCollections((current) =>
          current.filter((candidate) => candidate.id !== id),
        );
        setError(null);

        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "Collections are unreachable right now.",
        };
      }
    },
    [],
  );

  const movePhotos = useCallback(
    async (input: {
      fromId: string | null;
      toId: string | null;
      photoIds: string[];
    }): Promise<CollectionsResult> => {
      try {
        const response = await fetch("/api/collections/move", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          return { ok: false, error: await readError(response) };
        }

        const data = (await response.json()) as {
          from: Collection | null;
          to: Collection | null;
        };

        if (data.from) {
          apply(data.from);
        }

        if (data.to) {
          apply(data.to);
        }

        setError(null);

        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "Collections are unreachable right now.",
        };
      }
    },
    [apply],
  );

  const value = useMemo(
    () => ({
      collections,
      status,
      error,
      dialog,
      openCreate,
      openEdit,
      closeDialog,
      createCollection,
      updateCollection,
      removeCollection,
      movePhotos,
      reload,
    }),
    [
      collections,
      status,
      error,
      dialog,
      openCreate,
      openEdit,
      closeDialog,
      createCollection,
      updateCollection,
      removeCollection,
      movePhotos,
      reload,
    ],
  );

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections(): CollectionsContextValue {
  const context = useContext(CollectionsContext);

  if (!context) {
    throw new Error("useCollections must be used inside a CollectionsProvider.");
  }

  return context;
}
