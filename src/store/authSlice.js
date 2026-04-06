import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  status: false,      // isAuthenticated
  userData: null,     // Supabase user object
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action) {
      state.status = true
      state.userData = action.payload.userData
    },
    logout(state) {
      state.status = false
      state.userData = null
    },
    updateUserData(state, action) {
      if (state.userData) {
        state.userData = { ...state.userData, ...action.payload }
      }
    },
  },
})

export const { login, logout, updateUserData } = authSlice.actions

// Selectors
export const selectIsAuthenticated = (state) => state.auth.status
export const selectUserData = (state) => state.auth.userData

export default authSlice.reducer
