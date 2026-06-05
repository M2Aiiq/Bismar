import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

function getMetadataBase() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return new URL(configuredSiteUrl);
  }

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return new URL(vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`);
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "بسمار",
  description: "تنافس مع اصدقائك في معارك الكلمات و التلميحات",
  openGraph: {
    title: "بسمار",
    description: "تنافس مع اصدقائك في معارك الكلمات و التلميحات",
    images: [
      {
        url: "/bismar.jpg",
        alt: "بسمار",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "بسمار",
    description: "تنافس مع اصدقائك في معارك الكلمات و التلميحات",
    images: ["/bismar.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
