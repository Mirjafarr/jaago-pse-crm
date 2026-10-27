
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        display: 'block',
        width: '100%',
        marginTop: '32px',
        padding: '12px',
        backgroundColor: '#b91c1c',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      Sign out
    </button>
  )
}
