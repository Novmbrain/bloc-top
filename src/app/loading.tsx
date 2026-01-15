export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 mx-auto border-3 border-[var(--m3-primary-container)] border-t-[var(--m3-primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--m3-on-surface-variant)]">加载中...</p>
      </div>
    </div>
  );
}
