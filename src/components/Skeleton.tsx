export function SkeletonCard() {
  return (
    <div className="bg-unifi-surface rounded-xl border border-unifi-border overflow-hidden">
      <div className="p-4">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-lg shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 bg-unifi-bg/30 border-t border-unifi-border/50 space-y-2">
        <div className="h-2.5 w-1/4 rounded shimmer" />
        <div className="h-1.5 w-full rounded shimmer" />
        <div className="h-1.5 w-4/5 rounded shimmer" />
        <div className="h-1.5 w-3/5 rounded shimmer" />
      </div>
      <div className="px-4 py-2.5 border-t border-unifi-border/50">
        <div className="h-6 w-20 rounded shimmer ml-auto" />
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
