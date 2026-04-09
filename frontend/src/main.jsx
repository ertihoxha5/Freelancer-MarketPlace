import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import AppLayout from './routes/AppLayout.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import LandingPage from './pages/LandingPage.jsx'
import About from './pages/About.jsx'
import Features from './pages/Features.jsx'
import ErrorPage from './pages/ErrorPage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Contact from './pages/Contact.jsx'
import DemoProtected from './pages/DemoProtected.jsx'
import AdminDashboard from './pages/adminDashboard/dashboard.jsx'
import User from './pages/adminDashboard/users.jsx'

// Shtoni faqe të reja si fëmijë të layout-it më poshtë.
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/about', element: <About /> },
      { path: '/contact', element: <Contact /> },
      { path: '/features', element: <Features /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgotpassword', element: <ForgotPassword /> },
      { path: '/error', element: <ErrorPage /> },
      {
        path: '/demo-protected',
        element: (
          <ProtectedRoute>
            <DemoProtected />
          </ProtectedRoute>
        ),
      },
      {path:'/adminDashboard', element: <AdminDashboard />},
      {path:'/adminDashboard/users', element: <User />}
    ],
  },
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
