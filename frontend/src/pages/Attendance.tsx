import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Employee = { id: number; full_name: string; employee_id: string };

type Attendance = {
  id: number | null;
  employee: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  working_hours: string;
  status: string;
};

type FormState = {
  employee: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
};

const emptyForm: FormState = {
  employee: "",
  date: "",
  check_in: "",
  check_out: "",
  status: "PRESENT",
};

function getBackendMessage(error: any, fallback: string) {
  return error?.response?.data?.detail || fallback;
}

function formatAttendanceTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [month, setMonth] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadEmployees = async () => {
    const { data } = await api.get("/core/employees/");
    setEmployees(data.results ?? data);
  };

  const loadRecords = async () => {
    const { data } = month
      ? await api.get("/core/attendance/monthly_report/", { params: { month } })
      : await api.get("/core/attendance/");
    setRecords(data.results ?? data);
  };

  const loadTodayAttendance = async () => {
    const { data } = await api.get("/core/attendance/today/");
    setTodayAttendance(data);
  };

  useEffect(() => {
    setError("");
    if (user?.role === "EMPLOYEE") {
      loadTodayAttendance().catch((err) => setError(getBackendMessage(err, "Unable to load your attendance status.")));
      return;
    }
    Promise.all([loadEmployees(), loadRecords()]).catch(() => setError("Unable to load attendance data."));
  }, [month, user?.role]);

  const stats = useMemo(() => {
    const present = records.filter((record) => record.status === "PRESENT").length;
    const absent = records.filter((record) => record.status === "ABSENT").length;
    const average =
      records.length > 0
        ? (
            records.reduce((sum, record) => sum + Number(record.working_hours || 0), 0) /
            records.length
          ).toFixed(2)
        : "0.00";
    return { present, absent, average };
  }, [records]);
  const metricCards =
    user?.role === "EMPLOYEE"
      ? [
          ["Today Status", todayAttendance?.status ?? "ABSENT"],
          ["Check In", formatAttendanceTime(todayAttendance?.check_in)],
          ["Working Hours", `${todayAttendance?.working_hours ?? "0.00"} hrs`],
        ]
      : [
          ["Present Today", String(stats.present)],
          ["Absent Today", String(stats.absent)],
          ["Average Attendance", `${stats.average} hrs`],
        ];

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (record: Attendance) => {
    setEditingId(record.id);
    setForm({
      employee: String(record.employee),
      date: record.date,
      check_in: record.check_in ? record.check_in.slice(0, 16) : "",
      check_out: record.check_out ? record.check_out.slice(0, 16) : "",
      status: record.status,
    });
  };

  const submitRecord = async () => {
    setSaving(true);
    setError("");
    const payload = {
      employee: Number(form.employee),
      date: form.date,
      check_in: form.check_in ? new Date(form.check_in).toISOString() : null,
      check_out: form.check_out ? new Date(form.check_out).toISOString() : null,
      status: form.status,
    };
    try {
      if (editingId) {
        await api.patch(`/core/attendance/${editingId}/`, payload);
      } else {
        await api.post("/core/attendance/", payload);
      }
      await loadRecords();
      resetForm();
    } catch {
      setError("Failed to save attendance record.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (id: number) => {
    if (!window.confirm("Delete this attendance record?")) return;
    await api.delete(`/core/attendance/${id}/`);
    await loadRecords();
  };

  const checkIn = async () => {
    setChecking(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/core/attendance/check_in/");
      setTodayAttendance(data);
      setMessage(`Checked in successfully at ${formatAttendanceTime(data.check_in)}.`);
    } catch (err: any) {
      setError(getBackendMessage(err, "Unable to check in right now."));
    } finally {
      setChecking(false);
    }
  };

  const checkOut = async () => {
    setChecking(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/core/attendance/check_out/");
      setTodayAttendance(data);
      setMessage(`Checked out successfully at ${formatAttendanceTime(data.check_out)}.`);
    } catch (err: any) {
      setError(getBackendMessage(err, "Unable to check out right now."));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Attendance Management</h2>
          <p className="mt-2 text-slate-500">Check-in, check-out, and monthly reports with analytics cards.</p>
        </div>
        {user?.role === "EMPLOYEE" ? (
          <div className="flex gap-3">
            <Button onClick={checkIn} disabled={checking || Boolean(todayAttendance?.check_in)}>
              {checking ? "Saving..." : "Check In"}
            </Button>
            <Button
              variant="secondary"
              onClick={checkOut}
              disabled={checking || !todayAttendance?.check_in || Boolean(todayAttendance?.check_out)}
            >
              {checking ? "Saving..." : "Check Out"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metricCards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {user?.role !== "EMPLOYEE" ? (
          <Card>
            <h3 className="text-lg font-semibold">{editingId ? "Edit Attendance" : "Manual Attendance Entry"}</h3>
            <div className="mt-4 grid gap-3">
              <Select value={form.employee} onChange={(e) => setForm((current) => ({ ...current, employee: e.target.value }))}>
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_id})
                  </option>
                ))}
              </Select>
              <Input type="date" value={form.date} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} />
              <Input type="datetime-local" value={form.check_in} onChange={(e) => setForm((current) => ({ ...current, check_in: e.target.value }))} />
              <Input type="datetime-local" value={form.check_out} onChange={(e) => setForm((current) => ({ ...current, check_out: e.target.value }))} />
              <Select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half Day</option>
              </Select>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex gap-3">
                <Button type="button" onClick={submitRecord} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Record" : "Create Record"}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <h3 className="text-lg font-semibold">Self Service</h3>
            <p className="mt-2 text-sm text-slate-500">
              Use the check-in and check-out buttons above. You can check in once and check out once per day.
            </p>
            {message ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </Card>
        )}

        {user?.role !== "EMPLOYEE" ? (
          <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Attendance Records</h3>
              <p className="text-sm text-slate-500">Monthly list and actions</p>
            </div>
            <div className="flex items-center gap-3">
              <Input type="number" min="1" max="12" placeholder="Month number" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
              <Button variant="secondary" onClick={loadRecords}>
                Refresh
              </Button>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 pr-4">Employee</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Check In</th>
                  <th className="py-3 pr-4">Check Out</th>
                  <th className="py-3 pr-4">Hours</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const employee = employees.find((item) => item.id === record.employee);
                  return (
                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800/70">
                      <td className="py-4 pr-4">{employee?.full_name ?? `#${record.employee}`}</td>
                      <td className="py-4 pr-4">{record.date}</td>
                      <td className="py-4 pr-4">{record.check_in ? new Date(record.check_in).toLocaleString() : "-"}</td>
                      <td className="py-4 pr-4">{record.check_out ? new Date(record.check_out).toLocaleString() : "-"}</td>
                      <td className="py-4 pr-4">{record.working_hours}</td>
                      <td className="py-4 pr-4">{record.status}</td>
                      <td className="py-4 pr-4">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => startEdit(record)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => record.id !== null && deleteRecord(record.id)}
                            disabled={record.id === null}
                          >
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
        ) : (
          <Card>
            <h3 className="text-lg font-semibold">Your Attendance Today</h3>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <span className="text-slate-500">Date</span>
                <span className="font-medium">{todayAttendance?.date ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <span className="text-slate-500">Check In</span>
                <span className="font-medium">{formatAttendanceTime(todayAttendance?.check_in)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <span className="text-slate-500">Check Out</span>
                <span className="font-medium">{formatAttendanceTime(todayAttendance?.check_out)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <span className="text-slate-500">Status</span>
                <span className="font-medium">{todayAttendance?.status ?? "ABSENT"}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
