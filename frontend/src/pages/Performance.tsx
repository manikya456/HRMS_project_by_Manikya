import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

type Employee = { id: number; full_name: string; employee_id: string };

type Performance = {
  id: number;
  employee: number;
  attendance_score: number;
  task_score: number;
  manager_rating: number;
  final_score: string;
  ai_feedback: string;
  review_period: string;
};

type FormState = {
  employee: string;
  attendance_score: string;
  task_score: string;
  manager_rating: string;
  review_period: string;
};

const emptyForm: FormState = {
  employee: "",
  attendance_score: "0",
  task_score: "0",
  manager_rating: "0",
  review_period: "Monthly",
};

export default function PerformancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<Performance[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadEmployees = async () => {
    const { data } = await api.get("/core/employees/");
    setEmployees(data.results ?? data);
  };

  const loadRecords = async () => {
    const { data } = await api.get("/core/performance/");
    setRecords(data.results ?? data);
  };

  useEffect(() => {
    Promise.all([loadEmployees(), loadRecords()]).catch(() => setError("Unable to load performance data."));
  }, []);

  const summary = useMemo(
    () => ({
      average: records.length
        ? (records.reduce((sum, record) => sum + Number(record.final_score || 0), 0) / records.length).toFixed(2)
        : "0.00",
      highest: records.length ? Math.max(...records.map((record) => Number(record.final_score || 0))).toFixed(2) : "0.00",
    }),
    [records],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (record: Performance) => {
    setEditingId(record.id);
    setForm({
      employee: String(record.employee),
      attendance_score: String(record.attendance_score),
      task_score: String(record.task_score),
      manager_rating: String(record.manager_rating),
      review_period: record.review_period,
    });
  };

  const submitPerformance = async () => {
    setSaving(true);
    setError("");
    const payload = {
      employee: Number(form.employee),
      attendance_score: Number(form.attendance_score),
      task_score: Number(form.task_score),
      manager_rating: Number(form.manager_rating),
      review_period: form.review_period,
    };
    try {
      if (editingId) {
        await api.patch(`/core/performance/${editingId}/`, payload);
      } else {
        await api.post("/core/performance/", payload);
      }
      await loadRecords();
      resetForm();
    } catch {
      setError("Failed to save performance record.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: number) => {
    if (!window.confirm("Delete this performance entry?")) return;
    await api.delete(`/core/performance/${id}/`);
    await loadRecords();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Performance Management</h2>
        <p className="mt-2 text-slate-500">Attendance, task completion, manager rating, and AI-generated feedback.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Average Score", summary.average],
          ["Highest Score", summary.highest],
          ["Records", String(records.length)],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="text-lg font-semibold">{editingId ? "Edit Performance" : "Create Performance Review"}</h3>
          <div className="mt-4 grid gap-3">
            <Select value={form.employee} onChange={(e) => setForm((current) => ({ ...current, employee: e.target.value }))}>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_id})
                </option>
              ))}
            </Select>
            <Input type="number" placeholder="Attendance score" value={form.attendance_score} onChange={(e) => setForm((current) => ({ ...current, attendance_score: e.target.value }))} />
            <Input type="number" placeholder="Task score" value={form.task_score} onChange={(e) => setForm((current) => ({ ...current, task_score: e.target.value }))} />
            <Input type="number" placeholder="Manager rating" value={form.manager_rating} onChange={(e) => setForm((current) => ({ ...current, manager_rating: e.target.value }))} />
            <Select value={form.review_period} onChange={(e) => setForm((current) => ({ ...current, review_period: e.target.value }))}>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </Select>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <div className="flex gap-3">
              <Button type="button" onClick={submitPerformance} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Review" : "Create Review"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Performance Records</h3>
          <p className="text-sm text-slate-500">Final score and AI feedback are generated by the backend.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 pr-4">Employee</th>
                  <th className="py-3 pr-4">Score</th>
                  <th className="py-3 pr-4">Review Period</th>
                  <th className="py-3 pr-4">AI Feedback</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const employee = employees.find((item) => item.id === record.employee);
                  return (
                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800/70 align-top">
                      <td className="py-4 pr-4">{employee?.full_name ?? `#${record.employee}`}</td>
                      <td className="py-4 pr-4">{record.final_score}</td>
                      <td className="py-4 pr-4">{record.review_period}</td>
                      <td className="py-4 pr-4 max-w-sm">
                        <div className="line-clamp-3 text-slate-600 dark:text-slate-300">{record.ai_feedback || "-"}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => startEdit(record)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => deleteRecord(record.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
