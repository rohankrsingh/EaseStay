import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Outlet } from 'react-router-dom'
import authService from '@/supabase/authService'
import { login, logout } from '@/store/authSlice'
import Loader from '@/components/Loader'

function App() {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  useEffect(() => {
    // Hydrate Redux auth state from Supabase session on first load
    authService.getCurrentUser()
      .then(({ user, error }) => {
        if (user && !error) {
          dispatch(login({ userData: user }))
        } else {
          dispatch(logout())
        }
      })
      .finally(() => setLoading(false))

    // Keep Redux in sync with auth state changes (tab refresh, OAuth callback, etc.)
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        dispatch(login({ userData: session.user }))
      } else if (event === 'SIGNED_OUT') {
        dispatch(logout())
      }
    })

    return unsubscribe
  }, [dispatch])

  if (loading) return <Loader />

  return <Outlet />
}

export default App
