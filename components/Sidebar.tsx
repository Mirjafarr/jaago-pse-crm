
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  UsersRound,
  Handshake,
  CalendarDays,
  ListTodo,
  Trophy,
  Target,
  LogOut,
  Menu,
  X,
  ChevronRight,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Contacts',
    href: '/contacts',
    icon: UsersRound,
  },
  {
    name: 'Opportunities',
    href: '/opportunities',
    icon: Handshake,
  },
  {
    name: 'Meetings',
    href: '/meetings',
    icon: CalendarDays,
  },
  {
    name: 'Activities',
    href: '/activities',
    icon: ListTodo,
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: Trophy,
  },
  {
    name: 'Targets',
    href: '/targets',
    icon: Target,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setMobileOpen(false)
      router.replace('/login')
      router.refresh()
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : 'Unable to sign out.'
      )
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-5 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFC70B]">
            <HeartHandshake
              size={20}
              className="text-[#15171C]"
            />
          </div>

          <span className="text-lg font-black tracking-tight text-[#15171C]">
            JAAGO CRM
          </span>
        </div>

        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-[#15171C] hover:bg-gray-100"
        >
          <Menu size={23} />
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-screen w-[270px]
          shrink-0 flex-col border-r border-white/10
          bg-[#15171C] text-white
          transition-transform duration-300 ease-in-out
          lg:sticky lg:top-0 lg:z-30 lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="border-b border-white/10 px-5 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFC70B] shadow-lg shadow-yellow-500/10">
              <HeartHandshake
                size={26}
                strokeWidth={2.2}
                className="text-[#15171C]"
              />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight">
                JAAGO
                <span className="text-[#FFC70B]">
                  .
                </span>
              </h2>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Foundation
              </p>
            </div>

            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded-lg p-1 text-gray-400 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-[#FFC70B]/20 bg-[#FFC70B]/10 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#FFC70B]">
              Private Sector Engagement
            </p>

            <p className="mt-1 text-xs text-gray-300">
              Partnership Management Portal
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-6"
        >
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon

            const active =
              pathname === item.href ||
              (item.href !== '/' &&
                pathname.startsWith(item.href + '/'))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`
                  group flex items-center gap-3 rounded-xl
                  px-3.5 py-3 text-sm font-semibold
                  transition-all duration-200
                  ${
                    active
                      ? 'bg-[#FFC70B] text-[#15171C] shadow-md shadow-yellow-500/10'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2.4 : 1.9}
                  className="shrink-0"
                />

                <span className="flex-1">
                  {item.name}
                </span>

                {active && (
                  <ChevronRight size={16} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFC70B]/15">
              <ShieldCheck
                size={21}
                className="text-[#FFC70B]"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-white">
                Secure Workspace
              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                JAAGO PSE Internal CRM
              </p>
            </div>
          </div>

          {signOutError && (
            <p
              role="alert"
              className="mb-3 text-xs text-red-300"
            >
              {signOutError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >
            <LogOut size={17} />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>

          <p className="mt-4 text-center text-[10px] tracking-wide text-gray-600">
            Built for meaningful impact
          </p>
        </div>
      </aside>
    </>
  )
}
