import type { Metadata } from "next";
import { Caveat, Roboto } from "next/font/google";

import { SiteNav } from "@/components/nav/site-nav";
import { AddWidgetDialog } from "@/components/widgets/add-widget-dialog";
import { WidgetsProvider } from "@/components/widgets/widgets-provider";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Widget state is shared by the navbar's Add Widgets action, the
            canvas on the homepage and the add/edit dialog. */}
        <WidgetsProvider>
          <SiteNav />
          {/* The mobile bottom bar is fixed, so the content column reserves
              room for it instead of hiding the end of the page behind it. */}
          <div className="flex-1 pb-24 lg:pb-0">{children}</div>
          <AddWidgetDialog />
        </WidgetsProvider>
      </body>
    </html>
  );
}
