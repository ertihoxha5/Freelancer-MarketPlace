import { Link } from "react-router-dom";

const sidebarConfigs = {
  admin: [
    { label: "Dashboard", href: "/adminDashboard" },
    { label: "Users", href: "/adminDashboard/users" },
    { label: "Projects", href: "#projects" },
    {
      label: "Jobs with Freelancer",
      href: "/adminDashboard/jobs-with-freelancer",
    },
    {
      label: "Jobs without Freelancer",
      href: "/adminDashboard/jobs-without-freelancer",
    },
  ],
  freelancer: [
    { label: "Dashboard", href: "#overview" },
    { label: "Jobs", href: "#jobs" },
    { label: "Profile", href: "#profile" },
  ],
  client: [
    { label: "Dashboard", href: "#overview" },
    { label: "Post Project", href: "#post-project" },
    { label: "My Projects", href: "#my-projects" },
    { label: "Messages", href: "#messages" },
  ],
};

function getRoleConfig(roleID) {
  const numericRoleID = Number(roleID);

  if (numericRoleID === 1) {
    return sidebarConfigs.admin;
  }

  if (numericRoleID === 3) {
    return sidebarConfigs.freelancer;
  }

  if (numericRoleID === 2) {
    return sidebarConfigs.client;
  }

  return sidebarConfigs.freelancer;
}

export default function Sidebar({ roleID }) {
  const config = getRoleConfig(roleID);
  const roleLabel =
    Number(roleID) === 1
      ? "Admin"
      : Number(roleID) === 3
        ? "Freelancer"
        : "Client";

  return (
    <aside className="h-full min-h-full w-full self-stretch shrink-0 border-r border-slate-200 bg-white lg:w-64">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          {Number(roleID) === 1
            ? "Admin"
            : Number(roleID) === 3
              ? "Freelancer"
              : "Client"}
        </h2>
      </div>

      <nav className="flex flex-col py-3">
        {config.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className="px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
