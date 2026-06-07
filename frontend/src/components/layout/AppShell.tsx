import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { HRChatWidget } from "@/components/HRChatWidget";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-3xl glass px-6 py-5 text-sm text-slate-500">Loading AI-HRMS...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar role={user.role} />
      <div className="flex-1">
        <Topbar onMenuClick={() => setMobileOpen((v) => !v)} />
        {mobileOpen ? (
          <div className="lg:hidden border-b border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 p-4">
            <Sidebar role={user.role} mobile />
            <div className="mt-3 flex justify-end">
              <button className="text-xs text-slate-500" onClick={() => setMobileOpen(false)}>
                Close menu
              </button>
            </div>
          </div>
        ) : null}
        <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
        <HRChatWidget />
      </div>
    </div>
  );
}
