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
  description: "Deposit crypto. We trade forex. You earn daily returns. FCA regulated and fully transparent.",
  keywords: ["investing", "crypto", "forex", "daily returns", "FCA regulated", "naxcal"],
  authors: [{ name: "Naxcal Capital Ltd" }],
  openGraph: {
    title: "Naxcal — Your Money, Working 24/7",
    description: "Deposit crypto. We trade forex. You earn daily returns. FCA regulated and fully transparent.",
    url: "https://naxcal.com",
    siteName: "Naxcal",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Naxcal — Your Money, Working 24/7",
    description: "Deposit crypto. We trade forex. You earn daily returns.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  metadataBase: new URL("https://naxcal.com"),
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
