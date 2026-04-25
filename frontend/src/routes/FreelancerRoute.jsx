import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function FreelancerRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Number(user.roleID) !== 3) {
    if (Number(user.roleID) === 1) {
      return <Navigate to="/adminDashboard" replace />;
    }
    return <Navigate to="/client/dashboard" replace />;
  }

  return children;
}
