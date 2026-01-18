"use client";

import { useEffect } from "react";
import { Mountain, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CragError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Crag page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-[var(--space-page)]">
      <div className="text-center space-y-6 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--theme-primary-container)] flex items-center justify-center">
          <Mountain className="w-8 h-8 text-[var(--theme-primary)]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--theme-on-surface)]">
            岩场加载失败
          </h1>
          <p className="text-sm text-[var(--theme-on-surface-variant)] max-w-xs mx-auto">
            无法加载岩场信息，请检查网络连接后重试
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--theme-primary)] text-[var(--theme-on-primary)] font-medium transition-transform active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            重试
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[var(--theme-outline)] text-[var(--theme-on-surface)] font-medium transition-transform active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            返回岩场列表
          </Link>
        </div>
      </div>
    </div>
  );
}
