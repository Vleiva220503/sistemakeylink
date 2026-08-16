export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Warm Minimal Subtle Dot Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(26,25,23,0.8) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Soft Burnt Orange Ambient Highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  )
}
