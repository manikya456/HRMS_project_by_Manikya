import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, UserCircle2, Mail, Hash, BriefcaseBusiness, Building2, Clock3, Phone, MapPin, Users } from "lucide-react";
import type { ElementType } from "react";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mt-0.5 rounded-xl bg-teal-50 p-2 text-teal-600 dark:bg-teal-500/10">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? "Not available"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const employee = user?.employee_profile;
  const candidate = user?.candidate_profile;

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-teal-600">My Profile</p>
          <h2 className="mt-2 text-3xl font-semibold">Personal details and access information</h2>
          <p className="mt-2 text-slate-500">This page shows your account, role, and profile-specific information.</p>
        </div>
        <Badge className="w-fit bg-teal-50 text-teal-700">{user?.role}</Badge>
      </div>

      <Card className="overflow-hidden border-teal-100 bg-white p-0 shadow-soft">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 text-white">
                <UserCircle2 className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Account holder</p>
                <h3 className="mt-1 text-2xl font-semibold">{user?.first_name || user?.username}</h3>
                <p className="mt-1 text-sm text-white/80">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-white/85 sm:text-right">
              <p className="inline-flex items-center gap-2 sm:justify-end">
                <ShieldCheck className="h-4 w-4" />
                Secure JWT session
              </p>
              <p className="inline-flex items-center gap-2 sm:justify-end">
                <Hash className="h-4 w-4" />
                User ID: {user?.id}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-3 sm:p-8">
          <DetailRow icon={Mail} label="Email" value={user?.email} />
          <DetailRow icon={Users} label="Username" value={user?.username} />
          <DetailRow icon={ShieldCheck} label="Role" value={user?.role} />

          {employee ? (
            <>
              <DetailRow icon={Hash} label="Employee ID" value={employee.employee_id} />
              <DetailRow icon={Building2} label="Department" value={employee.department} />
              <DetailRow icon={BriefcaseBusiness} label="Designation" value={employee.designation} />
              <DetailRow icon={Clock3} label="Joining Date" value={employee.joining_date} />
              <DetailRow icon={Phone} label="Phone" value={employee.phone} />
              <DetailRow icon={MapPin} label="Address" value={employee.address} />
              <DetailRow icon={BriefcaseBusiness} label="Salary" value={employee.salary} />
              <DetailRow icon={Users} label="Manager" value={employee.manager ? `${employee.manager.full_name} (${employee.manager.employee_id})` : "No manager assigned"} />
            </>
          ) : null}

          {candidate ? (
            <>
              <DetailRow icon={Hash} label="Candidate ID" value={candidate.id} />
              <DetailRow icon={Phone} label="Phone" value={candidate.phone} />
              <DetailRow icon={BriefcaseBusiness} label="Applied Position" value={candidate.applied_position ? candidate.applied_position.title : "Not assigned"} />
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
