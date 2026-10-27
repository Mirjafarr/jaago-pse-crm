
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HeartHandshake, Mail, LockKeyhole, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (authError) {
        setError(authError.message)
        return
      }

      router.replace('/')
      router.refresh()
    } catch {
      setError('Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="jaago-login-page">
      <div className="jaago-login-card">

        {/* Branding */}
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFC70B] shadow-md">
            <HeartHandshake
              size={25}
              className="text-[#172334]"
            />
          </div>

          <div>
            <p className="text-xl font-extrabold tracking-tight text-[#172334]">
              JAAGO<span className="text-[#D8A000]">.</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Foundation
            </p>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold tracking-tight text-[#172334]">
          Welcome Back
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Sign in to your JAAGO PSE CRM workspace.
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-8 space-y-5">

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#172334]"
            >
              Email address
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your work email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="jaago-login-input pl-12!"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#172334]"
            >
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="jaago-login-input pl-12!"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Sign in */}
          <button
            type="submit"
            disabled={loading}
            className="jaago-login-button flex items-center justify-center gap-2!"
          >
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-5 text-center">
          <p className="text-xs leading-5 text-gray-500">
            Secure access for authorized JAAGO Foundation staff only.
          </p>

          <p className="mt-2 text-[11px] text-gray-400">
            Private Sector Engagement CRM
          </p>
        </div>

      </div>
    </div>
  )
}
