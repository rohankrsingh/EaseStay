import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectIsAuthenticated } from '@/store/authSlice'

/**
 * AuthLayout — protects routes based on auth state.
 *
 * <AuthLayout authentication>   → only for logged-in users (redirects to /login)
 * <AuthLayout authentication={false}> → only for guests (redirects to /)
 */
function AuthLayout({ children, authentication = true }) {
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (authentication && !isAuthenticated) {
      navigate('/login', { replace: true })
    } else if (!authentication && isAuthenticated) {
      navigate('/', { replace: true })
    }
    setChecking(false)
  }, [isAuthenticated, authentication, navigate])

  // Don't flash content while evaluating auth state
  if (checking) return null

  return children
}

export default AuthLayout
