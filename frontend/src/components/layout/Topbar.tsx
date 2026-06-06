import { Search, SunMoon, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <Button variant="ghost" className="lg:hidden p-2" onClick={onMenuClick}>
          <Menu className="h-4 w-4" />
        </Button>
        <div className="relative flex-1 max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-10 bg-slate-100/70 dark:bg-slate-900/70" placeholder="Search employees, candidates, payroll..." />
        </div>
        <Button variant="ghost" className="hidden md:inline-flex" onClick={toggleTheme}>
          <SunMoon className="h-4 w-4 mr-2" />
          Theme
        </Button>
        <Button variant="ghost" className="hidden md:inline-flex" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-100/80 px-3 py-2 dark:bg-slate-900">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.username ?? "Guest"}</p>
            <p className="text-xs text-slate-500">{user?.role ?? "Signed out"}</p>
          </div>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3 flex justify-end">
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}
