import { NavLink } from 'react-router-dom';

const sidebarConfigs = {
  admin: [
    { label: 'Dashboard', href: '/adminDashboard' },
    { label: 'Users', href: '/adminDashboard/users' },
    { label: 'Jobs with Freelancer', href: '/adminDashboard/jobs-with-freelancer' },
    { label: 'Jobs without Freelancer', href: '/adminDashboard/jobs-without-freelancer' },
  ],
  freelancer: [
    { label: 'Dashboard', href: '/freelancer/dashboard' },
    { label: 'Jobs', href: '/freelancer/jobs' },
    { label: 'Profile', href: '/freelancer/profile' },
  ],
  client: [
    { label: 'Dashboard', href: '/client/dashboard' },
    { label: 'Post Project', href: '/client/post-project' },
    { label: 'My Projects', href: '/client/projects' },
    { label: 'Messages', href: '/client/messages' },
  ],
};

function getRoleConfig(roleID) {
  const numericRoleID = Number(roleID);

  if (numericRoleID === 1) return sidebarConfigs.admin;
  if (numericRoleID === 3) return sidebarConfigs.freelancer;
  if (numericRoleID === 2) return sidebarConfigs.client;
  return sidebarConfigs.freelancer;
}

function getRoleLabel(roleID) {
  if (Number(roleID) === 1) return 'Admin';
  if (Number(roleID) === 3) return 'Freelancer';
  return 'Client';
}

export default function Sidebar({ roleID }) {
  const config = getRoleConfig(roleID);

  return (
    <aside className="h-full min-h-full w-full self-stretch shrink-0 border-r border-slate-200 bg-white lg:w-72">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Role</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">{getRoleLabel(roleID)}</h2>
      </div>

      <nav className="flex flex-col py-3">
        {config.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            className={({ isActive }) =>
              `px-6 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-100 text-slate-900 border-l-4 border-blue-600'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
