import { supabase } from '../supabase/client'

/**
 * Auth service — wraps Supabase auth methods with consistent error handling.
 * All methods return { data, error } to match Supabase's API contract.
 */
const authService = {
  /**
   * Sign up a new user with email + password.
   * Optionally accepts `metadata` (displayName, etc.)
   */
  async createAccount({ email, password, fullName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    return { data, error }
  },

  /** Sign in with email + password */
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  /** Sign out the currently authenticated user */
  async logout() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  /** Get the current session synchronously (already cached by Supabase) */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  /** Get the current session (includes access_token) */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  /** Listen to auth state changes — returns an unsubscribe function */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
    return () => subscription.unsubscribe()
  },

  /** OAuth sign-in (Google, GitHub, etc.) */
  async signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  /** Send a password reset email */
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  },
}

export default authService
