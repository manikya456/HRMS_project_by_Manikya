import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import api from "@/lib/api";

type Employee = { id: number; full_name: string; employee_id: string; salary?: string };

type Payroll = {
  id: number;
  employee: number;
  month: string;
  basic_salary: string;
  allowances: string;
  deductions: string;
  tax: string;
  net_salary: string;
  payslip_pdf: string | null;
};

type FormState = {
  employee: string;
  month: string;
  basic_salary: string;
  allowances: string;
  deductions: string;
  tax: string;
};

const emptyForm: FormState = {
  employee: "",
  month: new Date().toISOString().slice(0, 7),
  basic_salary: "",
  allowances: "0",
  deductions: "0",
  tax: "0",
};

function money(value: number) {
  return `Rs. ${value.toFixed(2)}`;
}

function resolveBackendFileUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const apiBaseUrl = api.defaults.baseURL ?? "http://localhost:8000/api";
  const backendOrigin = new URL(apiBaseUrl, window.location.origin).origin;
  return `${backendOrigin}${url}`;
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadEmployees = async () => {
    const { data } = await api.get("/core/employees/");
    setEmployees(data.results ?? data);
  };

  const loadPayrolls = async () => {
    const { data } = await api.get("/core/payroll/");
    setPayrolls(data.results ?? data);
  };

  useEffect(() => {
    Promise.all([loadEmployees(), loadPayrolls()]).catch(() => setError("Unable to load payroll data."));
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === Number(form.employee)),
    [employees, form.employee],
  );

  const preview = useMemo(() => {
    const basic = Number(form.basic_salary || 0);
    const allowances = Number(form.allowances || 0);
    const deductions = Number(form.deductions || 0);
    const tax = Number(form.tax || 0);
    return {
      gross: basic + allowances,
      net: basic + allowances - deductions - tax,
    };
  }, [form.basic_salary, form.allowances, form.deductions, form.tax]);

  const totalPayrollCost = useMemo(
    () => payrolls.reduce((sum, payroll) => sum + Number(payroll.net_salary || 0), 0).toFixed(2),
    [payrolls],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const autofillEmployeePayroll = (employeeId: string) => {
    const employee = employees.find((item) => item.id === Number(employeeId));
    const baseSalary = Number(employee?.salary || 0);
    setForm((current) => ({
      ...current,
      employee: employeeId,
      basic_salary: employee?.salary || current.basic_salary,
      allowances: baseSalary ? String(Math.round(baseSalary * 0.1)) : current.allowances,
      deductions: baseSalary ? String(Math.round(baseSalary * 0.05)) : current.deductions,
      tax: baseSalary ? String(Math.round(baseSalary * 0.08)) : current.tax,
    }));
  };

  const startEdit = (payroll: Payroll) => {
    setEditingId(payroll.id);
    setForm({
      employee: String(payroll.employee),
      month: payroll.month,
      basic_salary: payroll.basic_salary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      tax: payroll.tax,
    });
  };

  const submitPayroll = async () => {
    setSaving(true);
    setError("");
    const payload = {
      employee: Number(form.employee),
      month: form.month,
      basic_salary: form.basic_salary,
      allowances: form.allowances,
      deductions: form.deductions,
      tax: form.tax,
    };
    try {
      if (editingId) {
        await api.patch(`/core/payroll/${editingId}/`, payload);
      } else {
        await api.post("/core/payroll/", payload);
      }
      await loadPayrolls();
      resetForm();
    } catch {
      setError("Failed to save payroll.");
    } finally {
      setSaving(false);
    }
  };

  const deletePayroll = async (id: number) => {
    if (!window.confirm("Delete this payroll entry?")) return;
    await api.delete(`/core/payroll/${id}/`);
    await loadPayrolls();
  };

  const openPayslip = async (id: number) => {
    setError("");
    try {
      const { data } = await api.get(`/core/payroll/${id}/payslip/`);
      if (data.url) {
        const payslipUrl = resolveBackendFileUrl(data.url);
        const separator = payslipUrl.includes("?") ? "&" : "?";
        window.open(`${payslipUrl}${separator}v=${Date.now()}`, "_blank", "noopener,noreferrer");
        await loadPayrolls();
      }
    } catch {
      setError("Unable to open payslip.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Payroll Management</h2>
          <p className="mt-2 text-slate-500">Automatic payroll seeding, live net salary preview, and downloadable payslips.</p>
        </div>
        <Button onClick={resetForm}>Generate Payroll</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Records", String(payrolls.length)],
          ["Total Payroll Cost", money(Number(totalPayrollCost))],
          ["Current Month", form.month],
          ["Payslips", payrolls.filter((payroll) => Boolean(payroll.payslip_pdf)).length.toString()],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="text-lg font-semibold">{editingId ? "Edit Payroll" : "Generate Payroll"}</h3>
          <div className="mt-4 grid gap-3">
            <Select
              value={form.employee}
              onChange={(e) => {
                if (editingId) {
                  setForm((current) => ({ ...current, employee: e.target.value }));
                  return;
                }
                autofillEmployeePayroll(e.target.value);
              }}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_id})
                </option>
              ))}
            </Select>
            <Input type="month" value={form.month} onChange={(e) => setForm((current) => ({ ...current, month: e.target.value }))} />
            <Input
              type="number"
              placeholder="Basic salary"
              value={form.basic_salary}
              onChange={(e) => setForm((current) => ({ ...current, basic_salary: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Allowances"
              value={form.allowances}
              onChange={(e) => setForm((current) => ({ ...current, allowances: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Deductions"
              value={form.deductions}
              onChange={(e) => setForm((current) => ({ ...current, deductions: e.target.value }))}
            />
            <Input type="number" placeholder="Tax" value={form.tax} onChange={(e) => setForm((current) => ({ ...current, tax: e.target.value }))} />
            {selectedEmployee && !editingId ? (
              <p className="rounded-2xl bg-sky-50 px-4 py-3 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                Auto-filled from {selectedEmployee.full_name}'s base salary. You can still adjust allowances, deductions, and tax.
              </p>
            ) : null}
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <div className="flex gap-3">
              <Button type="button" onClick={submitPayroll} disabled={saving || !form.employee}>
                {saving ? "Saving..." : editingId ? "Update Payroll" : "Create Payroll"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Clear
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              The backend calculates the final net salary and generates the payslip PDF automatically.
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Payroll Records</h3>
              <p className="text-sm text-slate-500">Use the actions column to download payslips or edit entries.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gross preview</p>
                <p className="mt-1 font-semibold">{money(preview.gross)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Net preview</p>
                <p className="mt-1 font-semibold">{money(preview.net)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 pr-4">Employee</th>
                  <th className="py-3 pr-4">Month</th>
                  <th className="py-3 pr-4">Net Salary</th>
                  <th className="py-3 pr-4">Payslip</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => {
                  const employee = employees.find((item) => item.id === payroll.employee);
                  return (
                    <tr key={payroll.id} className="border-b border-slate-100 dark:border-slate-800/70">
                      <td className="py-4 pr-4">{employee?.full_name ?? `#${payroll.employee}`}</td>
                      <td className="py-4 pr-4">{payroll.month}</td>
                      <td className="py-4 pr-4">{money(Number(payroll.net_salary || 0))}</td>
                      <td className="py-4 pr-4">{payroll.payslip_pdf ? "Available" : "Generated on download"}</td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => startEdit(payroll)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => deletePayroll(payroll.id)}>
                            Delete
                          </Button>
                          <Button type="button" onClick={() => openPayslip(payroll.id)}>
                            Download
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
