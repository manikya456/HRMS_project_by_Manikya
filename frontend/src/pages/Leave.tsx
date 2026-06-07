import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Employee = { id: number; full_name: string; employee_id: string };

type Leave = {
  id: number;
  employee: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  ai_suggestion: string;
};

type FormState = {
  employee: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
};

const emptyForm: FormState = {
  employee: "",
  leave_type: "Casual Leave",
  start_date: "",
  end_date: "",
  reason: "",
};

const statusStyles: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export default function LeavePage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadEmployees = async () => {
    const { data } = await api.get("/core/employees/");
    setEmployees(data.results ?? data);
  };

  const loadLeaves = async () => {
    const { data } = await api.get("/core/leave/");
    setLeaves(data.results ?? data);
  };

  useEffect(() => {
    Promise.all([loadEmployees(), loadLeaves()]).catch(() => setError("Unable to load leave data."));
  }, []);

  useEffect(() => {
    const employeeId = user?.employee_profile?.id;
    if (user?.role === "EMPLOYEE" && employeeId) {
      setForm((current) => ({ ...current, employee: String(employeeId) }));
    }
  }, [user?.employee_profile?.id, user?.role]);

  const visibleLeaves = useMemo(
    () =>
      leaves
        .filter((leave) => statusFilter === "ALL" || leave.status === statusFilter)
        .filter((leave) => {
          if (user?.role !== "EMPLOYEE") return true;
          return user.employee_profile?.id ? leave.employee === user.employee_profile.id : false;
        }),
    [leaves, statusFilter, user?.role, user?.employee_profile?.id],
  );

  const resetForm = () => {
    setForm({
      ...emptyForm,
      employee: user?.employee_profile?.id ? String(user.employee_profile.id) : "",
    });
    setEditingId(null);
  };

  const startEdit = (leave: Leave) => {
    setEditingId(leave.id);
    setForm({
      employee: String(leave.employee),
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason,
    });
  };

  const submitLeave = async () => {
    setSaving(true);
    setError("");
    const payload = {
      employee: Number(form.employee),
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
    };
    try {
      if (editingId) {
        await api.patch(`/core/leave/${editingId}/`, payload);
      } else {
        await api.post("/core/leave/", payload);
      }
      await loadLeaves();
      resetForm();
    } catch {
      setError("Failed to save leave request.");
    } finally {
      setSaving(false);
    }
  };

  const approveLeave = async (id: number) => {
    await api.post(`/core/leave/${id}/approve/`);
    await loadLeaves();
  };

  const rejectLeave = async (id: number) => {
    await api.post(`/core/leave/${id}/reject/`);
    await loadLeaves();
  };

  const deleteLeave = async (id: number) => {
    if (!window.confirm("Delete this leave request?")) return;
    await api.delete(`/core/leave/${id}/`);
    await loadLeaves();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Leave Management</h2>
        <p className="mt-2 text-slate-500">Apply, approve, reject, and review leave requests.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,520px)] xl:items-start">
        <Card>
          <h3 className="text-lg font-semibold">{editingId ? "Edit Leave Request" : "Apply Leave"}</h3>
          <div className="mt-4 grid gap-3">
            {user?.role === "EMPLOYEE" ? (
              <Input value={user.employee_profile?.full_name ?? "Your profile"} readOnly />
            ) : (
              <Select value={form.employee} onChange={(e) => setForm((current) => ({ ...current, employee: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_id})
                  </option>
                ))}
              </Select>
            )}
            <Select value={form.leave_type} onChange={(e) => setForm((current) => ({ ...current, leave_type: e.target.value }))}>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Earned Leave">Earned Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
            </Select>
            <Input type="date" value={form.start_date} onChange={(e) => setForm((current) => ({ ...current, start_date: e.target.value }))} />
            <Input type="date" value={form.end_date} onChange={(e) => setForm((current) => ({ ...current, end_date: e.target.value }))} />
            <Textarea value={form.reason} onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Reason for leave" />
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <div className="flex gap-3">
              <Button type="button" onClick={submitLeave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Request" : "Submit Request"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Clear
              </Button>
            </div>
            {user?.employee_profile?.id ? (
              <p className="text-xs text-slate-500">Pre-filled for your employee profile: {user.employee_profile.full_name}</p>
            ) : null}
          </div>
        </Card>

        {user?.role !== "EMPLOYEE" ? (
          <Card className="self-start border-slate-200 bg-white">
            <div className="space-y-5 p-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-sky-600">Decision Support</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">AI Recommendation</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Leave requests are checked against employee attendance history and returned with a review suggestion.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Inputs</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">Dates, leave type, attendance</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Output</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">Approve or reject suggestion</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Goal</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">Faster consistent triage</p>
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Leave Requests</h3>
            <p className="text-sm text-slate-500">Live list from the DRF API</p>
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="md:w-56">
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 pr-4">Employee</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Dates</th>
                <th className="py-3 pr-4">Status</th>
                {user?.role !== "EMPLOYEE" ? <th className="py-3 pr-4">AI Suggestion</th> : null}
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeaves.map((leave) => {
                const employee = employees.find((item) => item.id === leave.employee);
                return (
                  <tr key={leave.id} className="border-b border-slate-100 dark:border-slate-800/70">
                    <td className="py-4 pr-4">{employee?.full_name ?? `#${leave.employee}`}</td>
                    <td className="py-4 pr-4">{leave.leave_type}</td>
                    <td className="py-4 pr-4">
                      {leave.start_date} to {leave.end_date}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge className={statusStyles[leave.status] ?? ""}>{leave.status}</Badge>
                    </td>
                    {user?.role !== "EMPLOYEE" ? <td className="py-4 pr-4">{leave.ai_suggestion || "-"}</td> : null}
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => startEdit(leave)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => deleteLeave(leave.id)}>
                          Delete
                        </Button>
                        {user?.role !== "EMPLOYEE" ? (
                          <>
                            <Button type="button" onClick={() => approveLeave(leave.id)}>
                              Approve
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => rejectLeave(leave.id)}>
                              Reject
                            </Button>
                          </>
                        ) : null}
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
  );
}
