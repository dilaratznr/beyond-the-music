import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beyondthemusic.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beyond The Music — Müzik Platformu",
    template: "%s | Beyond The Music",
  },
  description:
    "Müziğin ötesindeki kültürü keşfeden platform. Türler, sanatçılar, mimarlar, teori ve dinleme rotaları.",
  keywords: [
    "müzik",
    "kültür",
    "küratör",
    "tür",
    "sanatçı",
    "music",
    "culture",
    "curated",
    "genre",
    "artist",
  ],
  authors: [{ name: "Beyond The Music" }],
  creator: "Beyond The Music",
  publisher: "Beyond The Music",
  alternates: {
    canonical: "/",
    languages: {
      tr: "/tr",
      en: "/en",
      // `x-default` is the fallback Google shows when the visitor's
      // language preference matches neither tr nor en. Points to the
      // Turkish root because `/` redirects to `/tr`.
      "x-default": "/tr",
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    alternateLocale: "en_US",
    siteName: "Beyond The Music",
    title: "Beyond The Music — Müzik Platformu",
    description:
      "Müziğin ötesindeki kültürü keşfeden platform.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyond The Music",
    description:
      "Müziğin ötesindeki kültürü keşfeden platform.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      {/* Tüm görseller artık lokal `/uploads/*.webp` dosyalarından servis
          ediliyor — dns-prefetch'e gerek yok. Fontlar self-hosted
          (src/app/fonts.ts), Google Fonts preconnect'i de gerekmiyor.
          Boş <head> burada olmak zorunda değil; Next gerekli meta tag'ları
          zaten inject ediyor. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
