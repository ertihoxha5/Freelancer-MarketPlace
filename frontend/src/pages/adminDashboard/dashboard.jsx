import Header from '../../components/Header.jsx';
import Sidebar from '../../components/Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminDashboard() {
    const { user } = useAuth();

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 min-h-0 w-full p-0">
                <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
                    <Sidebar roleID={user?.roleID} />

                    <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
                        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
                        <p className="mt-2 text-slate-600">
                            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}.
                        </p>

                    </section>
                </div>
            </main>
        </div>
    );
};