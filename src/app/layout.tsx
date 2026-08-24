import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Naxcal — Weekday Investment Returns",
  description: "Track crypto, market positions, account activity, and Monday-through-Friday return records in one secure dashboard.",
  keywords: ["investing", "crypto", "forex", "portfolio dashboard", "weekday returns", "naxcal"],
  authors: [{ name: "Naxcal Capital Ltd" }],
  openGraph: {
    title: "Naxcal — Weekday Investment Returns",
    description: "Track crypto, market positions, account activity, and Monday-through-Friday return records in one secure dashboard.",
    url: "https://naxcal.us",
    siteName: "Naxcal",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Naxcal — Weekday Investment Returns",
    description: "Track crypto, market positions, account activity, and Monday-through-Friday return records in one secure dashboard.",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  metadataBase: new URL("https://naxcal.us"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
