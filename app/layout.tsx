import type { Metadata, Viewport } from "next";
import { Caveat, Roboto } from "next/font/google";

import { SiteNav } from "@/components/nav/site-nav";
import { PageTransition } from "@/components/scrapbook/page-transition";
import { ToastProvider } from "@/components/toast/toast-provider";
import { CollectionDialog } from "@/components/collections/collection-dialog";
import { CollectionsProvider } from "@/components/collections/collections-provider";
import { GalleryPhotosProvider } from "@/components/gallery/gallery-photos-provider";
import { GalleryUploadProvider } from "@/components/gallery/gallery-upload-provider";
import { HeroSlotsProvider } from "@/components/hero-slots-provider";
import { AddWidgetDialog } from "@/components/widgets/add-widget-dialog";
import { WidgetsProvider } from "@/components/widgets/widgets-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mimori",
  description: "A little home for our love story",
  applicationName: "Mimori",
  appleWebApp: {
    capable: true,
    title: "Mimori",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FF4FA3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* The gallery's photos wrap everything: collections, widgets and the
            upload dialog all read the same list, so a picker can never offer
            an image the Gallery does not hold. Both stores are shared by the
            navbar's primary action, the page that renders them and their
            add/edit dialogs; collections wrap widgets because the navbar reads
            both. The upload dialog is hosted here too, so + Add Memory and the
            collection/widget flows reach one shared upload. The carousel's
            slots sit here for the same reason: a replacement saved from the
            gallery reaches the home page without a reload. The toast provider
            is outermost because every one of them reports its own outcome, and
            a message has to outlive the dialog or the page that raised it. */}
        <ToastProvider>
          <GalleryPhotosProvider>
            <HeroSlotsProvider>
              <GalleryUploadProvider>
                <CollectionsProvider>
                  <WidgetsProvider>
                    <ServiceWorkerRegister />
                    <SiteNav />
                    <InstallPrompt />
                    {/* The mobile bottom bar is fixed, so the content column
                        reserves room for it instead of hiding the end of the
                        page behind it. This column is also where a navigation
                        settles in: it is the one node that survives every
                        route change, so the page can glide in without being
                        remounted. */}
                    <PageTransition className="flex-1 pb-24 lg:pb-0">
                      {children}
                    </PageTransition>
                    <AddWidgetDialog />
                    <CollectionDialog />
                  </WidgetsProvider>
                </CollectionsProvider>
              </GalleryUploadProvider>
            </HeroSlotsProvider>
          </GalleryPhotosProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
