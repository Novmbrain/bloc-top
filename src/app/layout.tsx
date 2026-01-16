import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import OfflineIndicator from "@/components/offline-indicator";
import SWUpdatePrompt from "@/components/sw-update-prompt";
import "./globals.css";

// Plus Jakarta Sans - 现代几何感字体，比 Geist 更有特色
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// JetBrains Mono - 优秀的等宽字体
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${jakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <OfflineIndicator />
          {children}
          <SWUpdatePrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
