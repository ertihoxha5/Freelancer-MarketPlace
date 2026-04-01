import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider} from 'react-router-dom'

import LandingPage from './pages/LandingPage.jsx'
import About from './pages/About.jsx'
import ErrorPage from './pages/ErrorPage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'

// PAS IMPLEMENTIMIT TE AUTH KJO NDRYSHON, TANI VETEM SHTONI FAQET KESHTU.
const router = createBrowserRouter([
  {path: '/', element: <LandingPage />},
  {path: '/about', element: <About />},
  {path: '/login', element: <Login />},
  {path: '/register', element: <Register />},
  {path: '/forgotpassword', element:<ForgotPassword />},
  {path: '/error', element:<ErrorPage />},
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
