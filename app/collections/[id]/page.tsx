import { Suspense } from "react";

import { CollectionDetail } from "@/components/collections/collection-detail";

/**
 * The id is a fallback param, so the navbar's `usePathname()` in the layout
 * cannot resolve during prerendering. This route therefore blocks instead of
 * prerendering a shell; the alternative — suspending the whole navbar behind a
 * fallback — would flash a missing header on every visit.
 */
export const instant = false;

/** `params` is request-time data, so the page provides a static shell and
 *  streams the collection in behind a fallback (cacheComponents). */
const page = (props: PageProps<"/collections/[id]">) => (
  <Suspense
    fallback={
      <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-full bg-paper/40" />
        <div className="mt-6 h-24 animate-pulse rounded-2xl bg-paper/50" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-4/3 animate-pulse rounded-[6px] bg-paper/50"
            />
          ))}
        </div>
      </main>
    }
  >
    <CollectionRoute params={props.params} />
  </Suspense>
);

async function CollectionRoute({
  params,
}: Pick<PageProps<"/collections/[id]">, "params">) {
  const { id } = await params;

  return <CollectionDetail collectionId={id} />;
}

export default page;
