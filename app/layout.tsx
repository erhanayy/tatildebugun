import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TatildeBugün | Tatil, Konaklama ve Rota Keşif Platformu",
  description:
    "Türkiye'nin en seçkin tatil beldeleri, otelleri, villaları ve rehberli turları ile hayalinizdeki tatili bugün planlayın.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
