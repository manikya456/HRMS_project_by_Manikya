import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import api from "@/lib/api";

const data = [
  { name: "Engineering", value: 42 },
  { name: "HR", value: 12 },
  { name: "Finance", value: 18 },
  { name: "Sales", value: 28 },
];

const colors = ["#0ea5e9", "#22c55e", "#8b5cf6", "#f59e0b"];

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    api.get("/analytics/metrics/").then((response) => setMetrics(response.data)).catch(() => setMetrics(null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Analytics Dashboard</h2>
        <p className="mt-2 text-slate-500">Company-wide metrics, performance trends, sentiment, and AI risk insights.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Department Distribution</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="card-gradient">
          <h3 className="font-semibold">AI Insights</h3>
          <div className="mt-4 space-y-4 text-sm">
            <p><span className="font-semibold">Attrition Risk:</span> {metrics?.attrition_risk?.level ?? "High"}, {metrics?.attrition_risk?.probability ?? 78}%</p>
            <p><span className="font-semibold">Department Health:</span> {metrics?.department_health?.score ?? 84}/100</p>
            <p><span className="font-semibold">Sentiment Analysis:</span> {metrics?.sentiment?.label ?? "Positive"}</p>
            <p><span className="font-semibold">Company Summary:</span> {metrics?.company_summary ?? "Stable growth, strong recruiting pipeline, and consistent attendance."}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
