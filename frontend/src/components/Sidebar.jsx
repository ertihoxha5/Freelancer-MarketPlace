import { NavLink } from "react-router-dom";
import { useRealtime } from "../context/RealtimeContext.jsx";
import {
  FiHome,
  FiSearch,
  FiUsers,
  FiTag,
  FiBriefcase,
  FiAlertTriangle,
  FiCreditCard,
  FiFileText,
  FiDownload,
  FiBarChart2,
  FiSettings,
  FiBell,
  FiUser,
  FiPlusCircle,
  FiFolder,
  FiHeart,
  FiClipboard,
  FiStar,
  FiDollarSign,
  FiMessageCircle,
} from "react-icons/fi";

const sidebarConfigs = {
  admin: [
    { label: "Dashboard", href: "/adminDashboard", icon: FiHome },
    { label: "Search", href: "/search", icon: FiSearch },
    { label: "Users", href: "/adminDashboard/users", icon: FiUsers },
    { label: "Skills/Categories", href: "/adminDashboard/catalog", icon: FiTag },
    {
      label: "Jobs with Freelancer",
      href: "/adminDashboard/jobs-with-freelancer",
      icon: FiBriefcase,
    },
    {
      label: "Jobs without Freelancer",
      href: "/adminDashboard/jobs-without-freelancer",
      icon: FiBriefcase,
    },
    { label: "Disputes", href: "/adminDashboard/disputes", icon: FiAlertTriangle },
    { label: "Payments", href: "/adminDashboard/payments", icon: FiCreditCard },
    { label: "Applications", href: "/adminDashboard/applications", icon: FiFileText },
    { label: "Export/Import", href: "/adminDashboard/export", icon: FiDownload },
    { label: "Reports", href: "/adminDashboard/reports", icon: FiBarChart2 },
    { label: "Settings", href: "/adminDashboard/settings", icon: FiSettings },
    { label: "Notifications", href: "/adminDashboard/notifications", icon: FiBell },
  ],
  freelancer: [
    { label: "Dashboard", href: "/freelancer/dashboard", icon: FiHome },
    { label: "Search", href: "/search", icon: FiSearch },
    { label: "Profile", href: "/freelancer/profile", icon: FiUser },
    { label: "Notifications", href: "/freelancer/notifications", icon: FiBell },
    { label: "Browse Projects", href: "/freelancer/browse-projects", icon: FiBriefcase },
    { label: "Favorite Projects", href: "/freelancer/favorites", icon: FiHeart },
    { label: "My Projects", href: "/freelancer/my-projects", badge: "projects", icon: FiFolder },
    { label: "Contracts", href: "/freelancer/contracts", badge: "contracts", icon: FiFileText },
    { label: "My Applications", href: "/freelancer/applications", badge: "applications", icon: FiClipboard },
    { label: "My Reports", href: "/freelancer/reports", icon: FiBarChart2 },
    { label: "My Reviews", href: "/freelancer/reviews", badge: "reviews", icon: FiStar },
    { label: "Payments", href: "/freelancer/payments", icon: FiDollarSign },
  ],
  client: [
    { label: "Dashboard", href: "/client/dashboard", icon: FiHome },
    { label: "Search", href: "/search", icon: FiSearch },
    { label: "Post Project", href: "/client/post-project", icon: FiPlusCircle },
    { label: "My Projects", href: "/client/projects", badge: "projects", icon: FiFolder },
    { label: "Applications", href: "/client/applications", badge: "applications", icon: FiClipboard },
    { label: "Contracts", href: "/client/contracts", badge: "contracts", icon: FiFileText },
    { label: "Hired Freelancers", href: "/client/hired-freelancers", icon: FiUsers },
    { label: "Notifications", href: "/client/notifications", icon: FiBell },
    { label: "My Profile", href: "/client/profile", icon: FiUser },
    { label: "Messages", href: "/client/messages", icon: FiMessageCircle },
  ],
};

function getRoleConfig(roleID) {
  const numericRoleID = Number(roleID);

  if (numericRoleID === 1) return sidebarConfigs.admin;
  if (numericRoleID === 3) return sidebarConfigs.freelancer;
  if (numericRoleID === 2) return sidebarConfigs.client;
  return sidebarConfigs.client;
}

function getRoleLabel(roleID) {
  const numeric = Number(roleID);
  if (numeric === 1) return "Administrator";
  if (numeric === 3) return "Freelancer";
  return "Client";
}

export default function Sidebar({ roleID }) {
  const config = getRoleConfig(roleID);
  const { badges, clearBadge } = useRealtime();

  return (
    <aside className="h-full w-72 shrink-0 border-r border-slate-200 bg-white hidden lg:block overflow-y-auto">
      <div className="px-6 py-6 border-b border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Your Role
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          {getRoleLabel(roleID)}
        </h2>
      </div>
    
      <nav className="py-2">
        {config.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={() => item.badge && clearBadge(item.badge)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#1a3c2e] text-white border-l-4 border-[#4a7043]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.badge && Number(badges[item.badge] || 0) > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {Number(badges[item.badge]) > 99
                  ? "99+"
                  : Number(badges[item.badge])}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
