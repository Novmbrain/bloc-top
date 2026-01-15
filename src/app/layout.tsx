import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import OfflineIndicator from "@/components/offline-indicator";
import SWUpdatePrompt from "@/components/sw-update-prompt";
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
  title: "罗源野抱 TOPO",
  description: "福州罗源攀岩线路分享 - 野外抱石攀岩指南",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "罗源TOPO",
  },
};

export const viewport: Viewport = {
  themeColor: "#667eea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OfflineIndicator />
        {children}
        <SWUpdatePrompt />
      </body>
    </html>
  );
}
