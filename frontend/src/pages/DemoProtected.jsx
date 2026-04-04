import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function DemoProtected() {
    const { user, signOut } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 px-4">
            <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-800">Protected area</h1>
                <p className="mt-2 text-slate-600">
                    This route is only reachable when you are signed in. It exists as a placeholder for future
                    dashboards or account pages.
                </p>
                {user ? (
                    <ul className="mt-4 space-y-1 text-sm text-slate-700">
                        <li>
                            <span className="font-medium text-slate-500">Email</span> {user.email}
                        </li>
                        <li>
                            <span className="font-medium text-slate-500">Name</span> {user.fullName}
                        </li>
                        <li>
                            <span className="font-medium text-slate-500">Role ID</span> {user.roleID}
                        </li>
                    </ul>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                        to="/"
                        className="rounded-lg bg-[#3964C6] px-4 py-2 text-white hover:bg-[#2F52A3]"
                    >
                        Home
                    </Link>
                    <button
                        type="button"
                        onClick={() => signOut()}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
