import type { Metadata } from "next";
import { InitialScrollReset } from "@/components/initial-scroll-reset";
import "./globals.css";

const title = "岠鋐不動產官方網站";
const description = "提供稅務、自備款試算、房市新聞最佳輔助";
const creator = "JU HONG Ryan製作";

export const metadata: Metadata = {
  metadataBase: new URL("https://property-tools-homepage.vercel.app"),
  title,
  description,
  applicationName: title,
  authors: [{ name: creator }],
  creator,
  publisher: "岠鋐不動產事業",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/",
    siteName: title,
    title,
    description,
    images: [
      {
        url: "/og-preview.jpg",
        width: 1729,
        height: 910,
        alt: "岠鋐不動產官方網站｜提供稅務、自備款試算、房市新聞最佳輔助",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-preview.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    note: creator,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <InitialScrollReset />
        {children}
      </body>
    </html>
  );
}

