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
    { label: 'My Jobs', href: '/freelancer/jobs' },
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
  return sidebarConfigs.client; // default si client nëse roleID është i panjohur
}

function getRoleLabel(roleID) {
  const numeric = Number(roleID);
  if (numeric === 1) return 'Administrator';
  if (numeric === 3) return 'Freelancer';
  return 'Client';
}

export default function Sidebar({ roleID }) {
  const config = getRoleConfig(roleID);

  return (
    <aside className="h-full w-72 shrink-0 border-r border-slate-200 bg-white hidden lg:block overflow-y-auto">
      <div className="px-6 py-6 border-b border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Role</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          {getRoleLabel(roleID)}
        </h2>
      </div>

      <nav className="py-2">
        {config.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-[#1a3c2e] text-white border-l-4 border-[#4a7043]' 
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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