import { lazy, Suspense } from "react";
import Loading from "./components/Loading.jsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Features = lazy(() => import("./pages/Features.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const AdminDashboard = lazy(
  () => import("./pages/adminDashboard/dashboard.jsx"),
);
const User = lazy(() => import("./pages/adminDashboard/users.jsx"));
const JobsWithFreelancer = lazy(
  () => import("./pages/adminDashboard/jobsWithFreelancer.jsx"),
);
const JobsWithoutFreelancer = lazy(
  () => import("./pages/adminDashboard/jobsWithoutFreelancer.jsx"),
);
const AdminNotifications = lazy(
  () => import("./pages/adminDashboard/AdminNotifications.jsx"),
);
const ClientDashboard = lazy(() => import("./pages/ClientDashboard.jsx"));
const ClientProjects = lazy(() => import("./pages/ClientProjects.jsx"));
const ClientPostProject = lazy(() => import("./pages/ClientPostProject.jsx"));
const ClientProfile = lazy(() => import("./pages/ClientProfile.jsx"));
const ClientNotifications = lazy(
  () => import("./pages/ClientNotifications.jsx"),
);
const ClientApplications = lazy(() => import("./pages/ClientApplications.jsx"));
const ClientMessages = lazy(() => import("./pages/ClientMessages.jsx"));
const FreelancerDashboard = lazy(
  () => import("./pages/FreelancerDashboard.jsx"),
);
const FreelancerProfile = lazy(() => import("./pages/FreelancerProfile.jsx"));
const FreelancerPublicProfile = lazy(
  () => import("./pages/FreelancerPublicProfile.jsx"),
);
const FreelancerBrowseProjects = lazy(
  () => import("./pages/FreelancerBrowseProjects.jsx"),
);
const FreelancerFavorites = lazy(
  () => import("./pages/FreelancerFavorites.jsx"),
);
const FreelancerMyApplications = lazy(
  () => import("./pages/FreelancerMyApplications.jsx"),
);
const FreelancerMyProjects = lazy(
  () => import("./pages/FreelancerMyProjects.jsx"),
);
const FreelancerNotifications = lazy(
  () => import("./pages/FreelancerNotifications.jsx"),
);
const ErrorPage = lazy(() => import("./pages/ErrorPage.jsx"));

// Shtoni faqe të reja si fëmijë të layout-it më poshtë.
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/features", element: <Features /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      {
        path: "/forgotpassword",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ForgotPassword />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      { path: "/error", element: <ErrorPage /> },
      {
        path: "/demo-protected",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <DemoProtected />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/dashboard",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientDashboard />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/projects",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientProjects />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/applications",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientApplications />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/post-project",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientPostProject />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/profile",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientProfile />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/notifications",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientNotifications />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/messages",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientMessages />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/adminDashboard",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <AdminDashboard />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: "/adminDashboard/users",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <User />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: "/adminDashboard/jobs-with-freelancer",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <JobsWithFreelancer />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: "/adminDashboard/jobs-without-freelancer",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <JobsWithoutFreelancer />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: "/adminDashboard/notifications",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <AdminNotifications />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: "/freelancer/notifications",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerNotifications />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/dashboard",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerDashboard />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/browse-projects",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerBrowseProjects />
            </Suspense>
            <FreelancerBrowseProjects />
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/profile",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              {" "}
              <FreelancerProfile />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/projects/:projectId/apply",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerMakeApplication />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/favorites",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerFavorites />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/applications",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerMyApplications />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/my-projects",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerMyProjects />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      { path: "/freelancers/:id", element: <FreelancerPublicProfile /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);
