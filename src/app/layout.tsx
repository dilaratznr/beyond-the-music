import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beyondthemusic.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beyond The Music — Küratöryel Müzik Platformu",
    template: "%s | Beyond The Music",
  },
  description:
    "Müziğin ötesindeki kültürü keşfeden küratöryel platform. Türler, sanatçılar, mimarlar, teori ve dinleme rotaları.",
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
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    alternateLocale: "en_US",
    siteName: "Beyond The Music",
    title: "Beyond The Music — Küratöryel Müzik Platformu",
    description:
      "Müziğin ötesindeki kültürü keşfeden küratöryel platform.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyond The Music",
    description:
      "Müziğin ötesindeki kültürü keşfeden küratöryel platform.",
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
      <head>
        {/* Uzak görsel host'una erken DNS çözümü — unsplash her sayfada
            hero kartlarında kullanılıyor. Fontlar artık self-hosted
            (src/app/fonts.ts), Google Fonts preconnect'i gerekmiyor. */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
