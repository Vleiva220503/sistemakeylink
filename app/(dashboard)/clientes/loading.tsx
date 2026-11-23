export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-44 bg-muted rounded" />
        <div className="h-4 w-56 bg-muted rounded" />
      </div>
      <div className="h-10 w-72 bg-muted rounded" />
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-14 bg-muted rounded border border-border" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    </div>
  )
}
