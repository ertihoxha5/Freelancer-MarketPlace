/* eslint-disable react-refresh/only-export-components */
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
import ClientRoute from './routes/ClientRoute.jsx';
import DemoProtected from './pages/DemoProtected.jsx';
import FreelancerMakeApplication from './pages/FreelancerMakeApplication.jsx';

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Features = lazy(() => import("./pages/Features.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const AdminDashboard = lazy(
  () => import("./pages/adminDashboard/dashboard.jsx"),
);
const User = lazy(() => import("./pages/adminDashboard/users.jsx"));
const Catalog = lazy(() => import("./pages/adminDashboard/Catalog.jsx"));
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
const AdminSettings = lazy(() => import("./pages/adminDashboard/Settings.jsx"));
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
const ProjectMilestones = lazy(() => import("./pages/ProjectMilestones.jsx"));
const ClientPayment = lazy(() => import("./pages/ClientPayment.jsx"));
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
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/forgotpassword", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
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
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientDashboard />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/projects",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientProjects />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/projects/:id",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientProjectDetail />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/applications",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientApplications />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/post-project",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientPostProject />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/profile",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientProfile />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/notifications",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientNotifications />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/messages",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientMessages />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/client/contracts",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientContracts />
            </Suspense>
          </ClientRoute>
        ),
      },
      {
        path: "/project-milestones/:contractId",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <ProjectMilestones />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/client/payment",
        element: (
          <ClientRoute>
            <Suspense fallback={<Loading />}>
              <ClientPayment />
            </Suspense>
          </ClientRoute>
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
        path: "/adminDashboard/catalog",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <Catalog />
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
        path: "/adminDashboard/settings",
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <AdminSettings />
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
