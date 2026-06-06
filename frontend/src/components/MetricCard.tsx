import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {delta ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            {delta}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
