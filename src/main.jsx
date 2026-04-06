import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import store from './store/store.js'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AuthLayout, Loader } from './components/index.js'
import NotFound from './pages/NotFound.jsx'

// Lazy-load all pages for code-splitting (bundle-dynamic-imports rule)
const Home = lazy(() => import('./pages/Home.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loader />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'login',
        element: (
          <AuthLayout authentication={false}>
            <Suspense fallback={<Loader />}>
              <Login />
            </Suspense>
          </AuthLayout>
        ),
      },
      {
        path: 'signup',
        element: (
          <AuthLayout authentication={false}>
            <Suspense fallback={<Loader />}>
              <Signup />
            </Suspense>
          </AuthLayout>
        ),
      },
      // Add more protected routes here:
      // {
      //   path: 'dashboard',
      //   element: (
      //     <AuthLayout authentication>
      //       <Suspense fallback={<Loader />}>
      //         <Dashboard />
      //       </Suspense>
      //     </AuthLayout>
      //   ),
      // },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
)
