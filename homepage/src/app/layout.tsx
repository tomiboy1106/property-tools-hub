import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "房產試算｜自備款可購總價與房地合一稅試算",
  description:
    "免費使用自備款可購總價與房地合一稅試算工具，提前掌握買房預算、貸款配置與賣房稅務成本。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
