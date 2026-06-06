import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50";
  const variants = {
    primary: "bg-sky-500 text-white hover:bg-sky-400 shadow-glow",
    secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
