import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { RealtimeProvider } from '../context/RealtimeContext.jsx';

export default function AppLayout() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <RealtimeProvider>
                    <Outlet />
                </RealtimeProvider>
            </AuthProvider>
        </LanguageProvider>
    );
}
