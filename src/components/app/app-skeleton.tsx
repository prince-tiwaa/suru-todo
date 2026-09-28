/** Static first paint while persisted data loads — mirrors the real layout so nothing jumps. */
export function AppSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-bg" aria-busy="true" aria-label="Loading Suru">
      <div className="hidden w-[252px] shrink-0 border-r border-line bg-bg-subtle p-4 lg:block">
        <div className="skeleton h-6 w-20 rounded-md" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-7 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-14 border-b border-line lg:hidden" />
        <div className="mx-auto max-w-[960px] px-4 pt-8 sm:px-6 lg:px-10 lg:pt-12">
          <div className="skeleton h-3 w-40 rounded" />
          <div className="skeleton mt-4 h-9 w-72 max-w-full rounded-lg" />
          <div className="skeleton mt-3 h-4 w-64 max-w-full rounded" />
          <div className="skeleton mt-8 h-[92px] rounded-2xl" />
          <div className="mt-8 grid grid-cols-3 gap-2.5">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
