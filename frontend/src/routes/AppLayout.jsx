import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import { LanguageProvider } from '../context/LanguageContext.jsx';
import { RealtimeProvider } from '../context/RealtimeContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

export default function AppLayout() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <ToastProvider>
                    <RealtimeProvider>
                        <Outlet />
                    </RealtimeProvider>
                </ToastProvider>
            </AuthProvider>
        </LanguageProvider>
    );
}
