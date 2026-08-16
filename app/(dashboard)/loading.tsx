import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full flex-col items-center justify-center space-y-4">
      {/* Premium minimal loader */}
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <Loader2 className="absolute h-5 w-5 text-primary animate-pulse" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <p className="text-sm font-mono font-bold tracking-widest text-foreground uppercase animate-pulse">
          MUNDO DE CALZADO
        </p>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Cargando datos del sistema...
        </p>
      </div>
    </div>
  )
}
