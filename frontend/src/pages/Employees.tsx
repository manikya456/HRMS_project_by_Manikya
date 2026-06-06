import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

type Employee = {
  id: number;
  user: number;
  user_email?: string;
  user_username_display?: string;
  user_role_display?: string;
  user_first_name_display?: string;
  user_last_name_display?: string;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
  salary: string;
  joining_date: string;
  manager: number | null;
  status: string;
  phone: string;
  address: string;
};

type EmployeeForm = {
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
  salary: string;
  joining_date: string;
  manager: string;
  status: string;
  phone: string;
  address: string;
  user_username: string;
  user_email_input: string;
  user_password: string;
  user_role: string;
  user_first_name: string;
  user_last_name: string;
};

const emptyForm: EmployeeForm = {
  employee_id: "",
  full_name: "",
  department: "Engineering",
  designation: "",
  salary: "",
  joining_date: "",
  manager: "",
  status: "ACTIVE",
  phone: "",
  address: "",
  user_username: "",
  user_email_input: "",
  user_password: "",
  user_role: "EMPLOYEE",
  user_first_name: "",
  user_last_name: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/core/employees/", {
        params: search ? { search } : undefined,
      });
      setEmployees(data.results ?? data);
    } catch {
      setError("Unable to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [search]);

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const departmentMatch = departmentFilter === "ALL" || employee.department === departmentFilter;
        const statusMatch = statusFilter === "ALL" || employee.status === statusFilter;
        return departmentMatch && statusMatch;
      }),
    [employees, departmentFilter, statusFilter],
  );

  const handleChange = (field: keyof EmployeeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      department: employee.department,
      designation: employee.designation,
      salary: employee.salary,
      joining_date: employee.joining_date,
      manager: employee.manager ? String(employee.manager) : "",
      status: employee.status,
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      user_username: employee.user_username_display ?? "",
      user_email_input: employee.user_email ?? "",
      user_password: "",
      user_role: employee.user_role_display ?? "EMPLOYEE",
      user_first_name: employee.user_first_name_display ?? "",
      user_last_name: employee.user_last_name_display ?? "",
    });
  };

  const submitEmployee = async () => {
    setSaving(true);
    setError("");
    const payload = {
      employee_id: form.employee_id,
      full_name: form.full_name,
      department: form.department,
      designation: form.designation,
      salary: form.salary,
      joining_date: form.joining_date,
      manager: form.manager ? Number(form.manager) : null,
      status: form.status,
      phone: form.phone,
      address: form.address,
      user_username: form.user_username,
      user_email_input: form.user_email_input,
      user_role: form.user_role,
      user_first_name: form.user_first_name,
      user_last_name: form.user_last_name,
      ...(form.user_password ? { user_password: form.user_password } : {}),
    };

    try {
      if (editingId) {
        await api.patch(`/core/employees/${editingId}/`, payload);
      } else {
        await api.post("/core/employees/", payload);
      }
      await loadEmployees();
      resetForm();
    } catch {
      setError("Failed to save employee. Check the form values and backend permissions.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (id: number) => {
    if (!window.confirm("Delete this employee?")) return;
    await api.delete(`/core/employees/${id}/`);
    await loadEmployees();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Employee Management</h2>
          <p className="mt-2 text-slate-500">Add, edit, delete, search, and filter employees by department.</p>
        </div>
        <Button onClick={resetForm}>Add Employee</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <h3 className="text-lg font-semibold">{editingId ? "Edit Employee" : "New Employee"}</h3>
          <div className="mt-4 grid gap-3">
            <Input value={form.employee_id} onChange={(e) => handleChange("employee_id", e.target.value)} placeholder="Employee ID" />
            <Input value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} placeholder="Full name" />
            <Input value={form.department} onChange={(e) => handleChange("department", e.target.value)} placeholder="Department" />
            <Input value={form.designation} onChange={(e) => handleChange("designation", e.target.value)} placeholder="Designation" />
            <Input value={form.salary} onChange={(e) => handleChange("salary", e.target.value)} placeholder="Salary" type="number" />
            <Input value={form.joining_date} onChange={(e) => handleChange("joining_date", e.target.value)} type="date" />
            <Select value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
            <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="Phone" />
            <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Address" />
            <Input value={form.manager} onChange={(e) => handleChange("manager", e.target.value)} placeholder="Manager Employee ID" type="number" />
            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
              <p className="text-sm font-semibold">Linked User</p>
              <div className="mt-3 grid gap-3">
                <Input value={form.user_username} onChange={(e) => handleChange("user_username", e.target.value)} placeholder="Username" />
                <Input value={form.user_email_input} onChange={(e) => handleChange("user_email_input", e.target.value)} placeholder="Email" />
                <Input value={form.user_password} onChange={(e) => handleChange("user_password", e.target.value)} placeholder={editingId ? "New password (optional)" : "Password"} type="password" />
                <Select value={form.user_role} onChange={(e) => handleChange("user_role", e.target.value)}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="HR_RECRUITER">HR Recruiter</option>
                  <option value="SENIOR_MANAGER">Senior Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Input value={form.user_first_name} onChange={(e) => handleChange("user_first_name", e.target.value)} placeholder="First name" />
                  <Input value={form.user_last_name} onChange={(e) => handleChange("user_last_name", e.target.value)} placeholder="Last name" />
                </div>
              </div>
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <div className="flex gap-3">
              <Button type="button" onClick={submitEmployee} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Employee" : "Create Employee"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Clear
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              When creating a new employee, the form can create the linked user account inline.
            </p>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 md:grid-cols-4">
            <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              {[...new Set(employees.map((employee) => employee.department))].map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
            <Button variant="secondary" onClick={loadEmployees}>
              Refresh
            </Button>
          </div>

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
                Loading employees...
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Department</th>
                    <th className="py-3 pr-4">Designation</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-slate-100 dark:border-slate-800/70">
                      <td className="py-4 pr-4">
                        <div className="font-medium">{employee.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {employee.employee_id} · {employee.user_email}
                        </div>
                      </td>
                      <td className="py-4 pr-4">{employee.department}</td>
                      <td className="py-4 pr-4">{employee.designation}</td>
                      <td className="py-4 pr-4">{employee.status}</td>
                      <td className="py-4 pr-4">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => startEdit(employee)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => deleteEmployee(employee.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
