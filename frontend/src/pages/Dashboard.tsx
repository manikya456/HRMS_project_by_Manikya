import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import api from "@/lib/api";

const attendanceData = [
  { name: "Mon", value: 86 },
  { name: "Tue", value: 91 },
  { name: "Wed", value: 88 },
  { name: "Thu", value: 94 },
  { name: "Fri", value: 89 },
];

const payrollData = [
  { name: "Jan", payroll: 82 },
  { name: "Feb", payroll: 88 },
  { name: "Mar", payroll: 91 },
  { name: "Apr", payroll: 97 },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    api
      .get("/analytics/metrics/")
      .then((response) => setMetrics(response.data))
      .catch(() => setMetrics(null));
  }, []);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Employees" value={metrics?.total_employees ?? "248"} delta="+12%" />
        <MetricCard label="Open Positions" value={metrics?.open_positions ?? "18"} delta="+3" />
        <MetricCard label="Candidates" value={metrics?.candidates ?? "124"} delta="+18%" />
        <MetricCard label="Interview Sessions" value={metrics?.interviews ?? "36"} delta="+7%" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Attendance Trend</h3>
              <p className="text-sm text-slate-500">Daily attendance performance across the week.</p>
            </div>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="url(#attGrad)" />
                <defs>
                  <linearGradient id="attGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold">Payroll Cost</h3>
          <p className="text-sm text-slate-500">Month-over-month trend.</p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payrollData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="payroll" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          "Notification Center",
          "Activity Timeline",
          "Recent Events",
        ].map((title) => (
          <Card key={title}>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Live events, approvals, and audit items will appear here once connected to the backend.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
