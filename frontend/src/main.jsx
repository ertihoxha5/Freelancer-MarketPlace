import { lazy, Suspense } from "react";
import Loading from "./components/Loading.jsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AppLayout from './routes/AppLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminRoute from './routes/AdminRoute.jsx';
import FreelancerRoute from './routes/FreelancerRoute.jsx';
import DemoProtected from './pages/DemoProtected.jsx';
import FreelancerMakeApplication from './pages/FreelancerMakeApplication.jsx';

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
const AdminReports = lazy(() => import("./pages/adminDashboard/Reports.jsx"));
const ExportImport = lazy(
  () => import("./pages/adminDashboard/ExportImport.jsx"),
);
const SearchPage = lazy(() => import("./pages/SearchPage.jsx"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard.jsx"));
const ClientProjects = lazy(() => import("./pages/ClientProjects.jsx"));
const ClientProjectDetail = lazy(() => import("./pages/ClientProjectDetail.jsx"));
const ClientPostProject = lazy(() => import("./pages/ClientPostProject.jsx"));
const ClientProfile = lazy(() => import("./pages/ClientProfile.jsx"));
const ClientNotifications = lazy(
  () => import("./pages/ClientNotifications.jsx"),
);
const ClientApplications = lazy(() => import("./pages/ClientApplications.jsx"));
const ClientMessages = lazy(() => import("./pages/ClientMessages.jsx"));
const ClientContracts = lazy(() => import("./pages/ClientContracts.jsx"));
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
const FreelancerReports = lazy(() => import("./pages/FreelancerReports.jsx"));
const FreelancerContracts = lazy(() => import("./pages/FreelancerContracts.jsx"));
const FreelancerReviews = lazy(() => import("./pages/FreelancerReviews.jsx"));
const ErrorPage = lazy(() => import("./pages/ErrorPage.jsx"));

// Add new pages as children of the layout below.
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
        path: "/search",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <SearchPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
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
        path: "/client/projects/:id",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientProjectDetail />
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
        path: "/client/contracts",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ClientContracts />
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
        path: "/adminDashboard/export",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <ExportImport />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: "/adminDashboard/reports",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <AdminReports />
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
      {
        path: "/freelancer/reports",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerReports />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/contracts",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerContracts />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      {
        path: "/freelancer/reviews",
        element: (
          <FreelancerRoute>
            <Suspense fallback={<Loading />}>
              <FreelancerReviews />
            </Suspense>
          </FreelancerRoute>
        ),
      },
      { path: "/freelancers/:id", element: <FreelancerPublicProfile /> },
      { path: "*", element: <Suspense fallback={<Loading />}><ErrorPage /></Suspense> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
