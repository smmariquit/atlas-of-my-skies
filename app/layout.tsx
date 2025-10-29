import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "atlas of our skies",
  description: "A personal atlas of photos and skies — images, dates, and locations captured across many places.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  openGraph: {
    title: "atlas of our skies",
    description: "the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)",

    url: "https://atlas-of-my-skies.stimmie.dev",
    siteName: "atlas of my skies",
    images: [
      {
        url: "/images/83.jpg",
        width: 1200,
        height: 630,
        alt: "atlas of my skies",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "atlas of our skies",
    description: "the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)",
    images: ["/images/83.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
