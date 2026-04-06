import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'

// Add more slices here as you build features (e.g. listingsSlice, bookingsSlice)
const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  // Enable Redux DevTools in development automatically
  devTools: import.meta.env.MODE !== 'production',
})

export default store
