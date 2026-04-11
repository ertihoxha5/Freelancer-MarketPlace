import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';

export default function AppLayout() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <Outlet />
            </AuthProvider>
        </LanguageProvider>
    );
}
