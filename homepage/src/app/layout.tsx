import type { Metadata } from "next";
import { InitialScrollReset } from "@/components/initial-scroll-reset";
import "./globals.css";

const title = "房地產全方位｜買賣稅務試算";
const description = "岠鋐不動產事業製作";

export const metadata: Metadata = {
  metadataBase: new URL("https://property-tools-homepage.vercel.app"),
  title,
  description,
  applicationName: "房地產全方位",
  authors: [{ name: "岠鋐不動產事業" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/",
    siteName: "房地產全方位",
    title,
    description,
    images: [
      {
        url: "/og-preview.jpg",
        width: 1729,
        height: 910,
        alt: "岠鋐團隊不動產財務試算",
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

