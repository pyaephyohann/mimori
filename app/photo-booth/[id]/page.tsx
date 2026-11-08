import type { Metadata } from "next";
import { Suspense } from "react";

import { PhotoBoothSession } from "@/components/photo-booth/photo-booth-session";

export const metadata: Metadata = {
  title: "Photo Booth — Mimori",
  description: "Keep decorating a saved photobooth.",
};

/**
 * The id is a fallback param, so the navbar's `usePathname()` in the layout
 * cannot resolve during prerendering. This route therefore blocks instead of
 * prerendering a shell, matching the collection detail route.
 */
export const instant = false;

/** `params` is request-time data, so the page streams the session in behind a fallback. */
const page = (props: PageProps<"/photo-booth/[id]">) => (
  <Suspense
    fallback={
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-full bg-paper/40" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-paper/50" />
      </main>
    }
  >
    <SessionRoute params={props.params} />
  </Suspense>
);

async function SessionRoute({
  params,
}: Pick<PageProps<"/photo-booth/[id]">, "params">) {
  const { id } = await params;

  return <PhotoBoothSession sessionId={id} />;
}

export default page;
