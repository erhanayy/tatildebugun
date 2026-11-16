import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n/context";
import { getServerLocale } from "@/lib/i18n/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://alltripx.com"),
  title: {
    default: "AllTripX | Global Travel Map & Explorer Network",
    template: "%s | AllTripX",
  },
  description:
    "Build your personal world travel map, track visited countries and cities, chart journeys, and connect with fellow explorers worldwide on AllTripX.",
  openGraph: {
    title: "AllTripX | Global Travel Map & Explorer Network",
    description: "Build your personal travel map and match journeys with travelers worldwide.",
    url: "https://alltripx.com",
    siteName: "AllTripX",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://alltripx.com",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getServerLocale();

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider initialLocale={initialLocale}>
          {children}
          <Toaster position="top-right" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
