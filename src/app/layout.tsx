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
  title: "寻岩记",
  description: "福州罗源攀岩线路分享 - 野外抱石攀岩指南",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "寻岩记",
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
          {/* 桌面端外层背景 - 移动端不可见 */}
          <div
            className="min-h-screen"
            style={{ backgroundColor: "var(--theme-desktop-bg)" }}
          >
            {/* 居中容器 - 移动端全宽，桌面端固定宽度居中 + 阴影 */}
            <div
              id="app-shell"
              className="relative mx-auto w-full min-h-screen md:shadow-2xl"
              style={{ maxWidth: "var(--app-shell-width)", backgroundColor: "var(--theme-surface)" }}
            >
              <OfflineIndicator />
              {children}
              <SWUpdatePrompt />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
