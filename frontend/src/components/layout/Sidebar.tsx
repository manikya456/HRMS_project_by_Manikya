import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardList,
  LayoutDashboard,
  Mic2,
  Settings,
  Sparkles,
  Users,
  FileScan,
  Bot,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE"] as Role[] },
  { label: "Employees", to: "/employees", icon: Users, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "Attendance", to: "/attendance", icon: CalendarCheck2, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE"] as Role[] },
  { label: "Leave", to: "/leave", icon: ClipboardList, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE"] as Role[] },
  { label: "Payroll", to: "/payroll", icon: BriefcaseBusiness, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "Performance", to: "/performance", icon: BarChart3, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "Recruitment", to: "/recruitment", icon: Sparkles, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "Resume Screening", to: "/resume-screening", icon: FileScan, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "Bulk Resume Screening", to: "/bulk-resume-screening", icon: FileScan, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "AI Interview", to: "/voice-interview", icon: Mic2, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"] as Role[] },
  { label: "Analytics", to: "/analytics", icon: BarChart3, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE"] as Role[] },
  { label: "Settings", to: "/settings", icon: Settings, roles: ["ADMIN", "SENIOR_MANAGER", "HR_RECRUITER", "EMPLOYEE", "CANDIDATE"] as Role[] },
];

export function Sidebar({ role, mobile = false }: { role: Role; mobile?: boolean }) {
  const containerClass = mobile
    ? "flex w-full flex-col border border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-3xl"
    : "hidden lg:flex w-72 flex-col border-r border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl";

  return (
    <aside className={containerClass}>
      <div className="p-6 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400 shadow-glow" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">AI-HRMS</p>
            <h1 className="text-lg font-semibold">Intelligent HR</h1>
          </div>
        </div>
        <Badge className="mt-4">{role.replace("_", " ")}</Badge>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.filter((item) => item.roles.includes(role)).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white shadow-glow dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900/80",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
