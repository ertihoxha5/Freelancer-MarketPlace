import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
                Loading…
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (Number(user.roleID) !== 1) {
        if (Number(user.roleID) === 2) {
            return <Navigate to="/client/dashboard" replace />;
        }
        if (Number(user.roleID) === 3) {
            return <Navigate to="/freelancer/dashboard" replace />;
        }
    }

    return children;
}
