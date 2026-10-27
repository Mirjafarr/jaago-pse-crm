
'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login'

  if (isAuthPage) {
    return (
      <main className="min-h-screen bg-[#F5F0E4]">
        {children}
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F5F0E4]">
      <Sidebar />

      <main className="min-w-0 flex-1 bg-[#F5F0E4] px-5 pb-10 pt-24 sm:px-8 lg:px-10 lg:pt-9">
        {children}
      </main>
    </div>
  )
}
