import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", className)}>
      {children}
    </span>
  );
}
