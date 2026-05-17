import { Suspense } from 'react'
import StatusPage from './StatusPage'

export function generateMetadata({ params }: { params: { ref: string } }) {
  return {
    title: `${params.ref} — Subhan Complaints`,
  }
}

export default function Page({ params }: { params: { ref: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <StatusPage referenceNumber={params.ref.toUpperCase()} />
    </Suspense>
  )
}
