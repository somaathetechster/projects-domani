import type { Metadata } from "next";
import { Figtree, DM_Mono, Bodoni_Moda } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Domani Portal",
  description: "Domani client delivery workspace — we build tomorrow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${figtree.variable} ${dmMono.variable} ${bodoni.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
