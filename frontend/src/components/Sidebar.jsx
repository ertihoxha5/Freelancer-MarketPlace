import { NavLink } from "react-router-dom";
import { useRealtime } from "../context/RealtimeContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
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
    { labelKey: "dashboard", href: "/adminDashboard", icon: FiHome },
    { labelKey: "analytics", href: "/adminDashboard/analytics", icon: FiBarChart2 },
    { labelKey: "search", href: "/search", icon: FiSearch },
    { labelKey: "users", href: "/adminDashboard/users", icon: FiUsers },
    { labelKey: "contracts", href: "/adminDashboard/contracts", icon: FiFileText },
    { labelKey: "skillsCategories", href: "/adminDashboard/catalog", icon: FiTag },
    {
      labelKey: "jobsWithFreelancer",
      href: "/adminDashboard/jobs-with-freelancer",
      icon: FiBriefcase,
    },
    {
      labelKey: "jobsWithoutFreelancer",
      href: "/adminDashboard/jobs-without-freelancer",
      icon: FiBriefcase,
    },
    { labelKey: "disputes", href: "/adminDashboard/disputes", icon: FiAlertTriangle },
    { labelKey: "payments", href: "/adminDashboard/payments", icon: FiCreditCard },
    { labelKey: "applications", href: "/adminDashboard/applications", icon: FiFileText },
    { labelKey: "exportImport", href: "/adminDashboard/export", icon: FiDownload },
    { labelKey: "reports", href: "/adminDashboard/reports", icon: FiBarChart2 },
    { labelKey: "settings", href: "/adminDashboard/settings", icon: FiSettings },
    { labelKey: "notifications", href: "/adminDashboard/notifications", icon: FiBell },
    { labelKey: "auditLogs", href: "/adminDashboard/audit-logs", icon: FiFileText },
    { labelKey: "testimonials", href: "/adminDashboard/testimonials", icon: FiStar },
    { labelKey: "reviews", href: "/adminDashboard/reviews", icon: FiStar },
    { labelKey: "milestones", href: "/adminDashboard/milestones", icon: FiFileText },
  ],
  freelancer: [
    { labelKey: "dashboard", href: "/freelancer/dashboard", icon: FiHome },
    { labelKey: "search", href: "/search", icon: FiSearch },
    { labelKey: "profile", href: "/freelancer/profile", icon: FiUser },
    { labelKey: "notifications", href: "/freelancer/notifications", icon: FiBell },
    { labelKey: "browseProjects", href: "/freelancer/browse-projects", icon: FiBriefcase },
    { labelKey: "favoriteProjects", href: "/freelancer/favorites", icon: FiHeart },
    { labelKey: "myProjects", href: "/freelancer/my-projects", badge: "projects", icon: FiFolder },
    { labelKey: "contracts", href: "/freelancer/contracts", badge: "contracts", icon: FiFileText },
    { labelKey: "messages", href: "/freelancer/messages", icon: FiMessageCircle },
    { labelKey: "myApplications", href: "/freelancer/applications", badge: "applications", icon: FiClipboard },
    { labelKey: "myReports", href: "/freelancer/reports", icon: FiBarChart2 },
    { labelKey: "myReviews", href: "/freelancer/reviews", badge: "reviews", icon: FiStar },
    { labelKey: "payments", href: "/freelancer/payments", icon: FiDollarSign },
  ],
  client: [
    { labelKey: "dashboard", href: "/client/dashboard", icon: FiHome },
    { labelKey: "search", href: "/search", icon: FiSearch },
    { labelKey: "postProject", href: "/client/post-project", icon: FiPlusCircle },
    { labelKey: "myProjects", href: "/client/projects", badge: "projects", icon: FiFolder },
    { labelKey: "applications", href: "/client/applications", badge: "applications", icon: FiClipboard },
    { labelKey: "contracts", href: "/client/contracts", badge: "contracts", icon: FiFileText },
    { labelKey: "disputes", href: "/client/disputes", icon: FiAlertTriangle },
    { labelKey: "testimonials", href: "/client/testimonials", icon: FiStar },
    { labelKey: "hiredFreelancers", href: "/client/hired-freelancers", icon: FiUsers },
    { labelKey: "notifications", href: "/client/notifications", icon: FiBell },
    { labelKey: "myProfile", href: "/client/profile", icon: FiUser },
    { labelKey: "messages", href: "/client/messages", icon: FiMessageCircle },
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
  if (numeric === 1) return "admin";
  if (numeric === 3) return "freelancer";
  return "client";
}

export default function Sidebar({ roleID }) {
  const config = getRoleConfig(roleID);
  const { badges, clearBadge } = useRealtime();
  const { t } = useLanguage();

  return (
    <aside className="h-full w-72 shrink-0 border-r border-slate-200 bg-white hidden lg:block overflow-y-auto">
      <div className="px-6 py-6 border-b border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {t('yourRole')}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          {t(getRoleLabel(roleID))}
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
            <span className="min-w-0 flex-1">{t(item.labelKey || item.label)}</span>
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
