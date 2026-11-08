import type { Metadata } from "next";

import { CollectionsPage } from "@/components/collections/collections-page";

export const metadata: Metadata = {
  title: "Collections — Mimori",
  description: "Every little moment deserves its own place.",
};

const page = () => <CollectionsPage />;

export default page;
