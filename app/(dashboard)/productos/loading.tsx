export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-48 bg-muted rounded" />
        <div className="h-4 w-36 bg-muted rounded" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-72 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="h-56 bg-muted rounded-lg border border-border" style={{ opacity: 1 - i * 0.08 }} />
        ))}
      </div>
    </div>
  )
}
