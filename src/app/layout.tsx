import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
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
