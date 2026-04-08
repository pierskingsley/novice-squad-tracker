export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
}

export function HomePageSkeleton() {
  return (
    <div className="px-4 pt-6 pb-28">
      {/* Header */}
      <div className="mb-5">
        <Skeleton className="h-3 w-32 mb-2 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>

      {/* Stats card */}
      <div className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between mb-5 border border-slate-200 shadow-sm">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-2.5 w-8 rounded-full" />
          </div>
        ))}
      </div>

      {/* Exercise cards */}
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-3 p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map(j => (
              <div key={j} className="grid grid-cols-[32px_1fr_1fr_44px_24px] gap-2 items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function HistoryPageSkeleton() {
  return (
    <div className="px-4 pt-6 pb-28">
      <Skeleton className="h-8 w-24 mb-5" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-48 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="px-4 pt-6 pb-28">
      {/* Name */}
      <div className="mb-6">
        <Skeleton className="h-8 w-40 mb-1" />
        <Skeleton className="h-3 w-24 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col items-center gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-2.5 w-14 rounded-full" />
          </div>
        ))}
      </div>

      {/* PR list */}
      <Skeleton className="h-4 w-24 mb-3 rounded-full" />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
