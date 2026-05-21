import { Suspense } from 'react'
import StartFork from './StartFork'

export const metadata = {
  title: 'How was your journey? — Subhan Travels',
}

export default function StartPage() {
  return (
    <Suspense>
      <StartFork />
    </Suspense>
  )
}
