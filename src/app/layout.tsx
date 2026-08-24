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
  title: "Naxcal — Your Money, Working 24/7",
  description: "Track deposits, portfolio positions, eligible-weekday credits, and account activity in one dashboard.",
  keywords: ["portfolio dashboard", "crypto", "stocks", "account tracking", "naxcal"],
  authors: [{ name: "Naxcal Capital Ltd" }],
  openGraph: {
    title: "Naxcal — Your Money, Working 24/7",
    description: "Track deposits, portfolio positions, eligible-weekday credits, and account activity in one dashboard.",
    url: "https://naxcal.us",
    siteName: "Naxcal",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Naxcal — Your Money, Working 24/7",
    description: "Track portfolio positions, eligible-weekday credits, and account activity.",
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
