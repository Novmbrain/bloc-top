import { MapPin, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-[var(--space-page)]">
      <div className="text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--m3-primary-container)] flex items-center justify-center">
          <MapPin className="w-8 h-8 text-[var(--m3-primary)]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--m3-on-surface)]">
            页面未找到
          </h1>
          <p className="text-sm text-[var(--m3-on-surface-variant)] max-w-xs mx-auto">
            抱歉，你要找的页面不存在或已被移除
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] font-medium transition-transform active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>

          <Link
            href="/route"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[var(--m3-outline)] text-[var(--m3-on-surface)] font-medium transition-transform active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            浏览线路
          </Link>
        </div>
      </div>
    </div>
  );
}
