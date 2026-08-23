import { Suspense } from 'react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { LoginForm } from './login-form'

/**
 * Skeleton que imita visualmente el formulario de login
 * mientras se hidrata el componente cliente (LoginForm).
 */
function LoginSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse">
      <Card className="border-border bg-card shadow-2xl relative overflow-hidden rounded-none">
        <div className="h-1.5 w-full bg-primary" />
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="bg-secondary/40 rounded h-20 w-44 border border-border/40 mb-2" />
          <div className="h-3 w-32 bg-secondary/50 rounded mt-2" />
        </div>
        <CardContent className="space-y-6 px-6 pb-6 pt-4">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-secondary/50 rounded" />
            <div className="h-10 w-full bg-secondary/30 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 bg-secondary/50 rounded" />
            <div className="h-10 w-full bg-secondary/30 rounded" />
          </div>
          <div className="h-12 w-full bg-secondary/40 rounded mt-4" />
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border pt-4 pb-4 bg-secondary/30">
          <div className="h-3 w-48 bg-secondary/50 rounded" />
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
