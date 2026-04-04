import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export default function AppLayout() {
    return (
        <AuthProvider>
            <Outlet />
        </AuthProvider>
    );
}
