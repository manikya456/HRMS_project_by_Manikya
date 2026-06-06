import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import api from "@/lib/api";

type Job = {
  id: number;
  title: string;
  department: string;
  description: string;
  required_skills: string;
  jd_text: string;
  extracted_skills: string[];
  experience_required: string;
  is_active: boolean;
};

type JobForm = {
  title: string;
  department: string;
  description: string;
  required_skills: string;
  experience_required: string;
  is_active: string;
  jd_file: File | null;
};

const emptyForm: JobForm = {
  title: "",
  department: "Engineering",
  description: "",
  required_skills: "",
  experience_required: "",
  is_active: "true",
  jd_file: null,
};

function SkillPills({ skills }: { skills: string[] }) {
  if (!skills.length) {
    return <p className="text-xs text-slate-500">No extracted skills yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span key={skill} className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
          {skill}
        </span>
      ))}
    </div>
  );
}

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadJobs = async () => {
    const { data } = await api.get("/recruitment/jobs/");
    setJobs(data.results ?? data);
  };

  useEffect(() => {
    loadJobs().catch(() => setJobs([]));
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setError("");
    setStatus("");
  };

  const saveJob = async () => {
    setSaving(true);
    setError("");
    setStatus("Saving job opening...");
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("department", form.department);
      formData.append("description", form.description);
      formData.append("required_skills", form.required_skills);
      formData.append("experience_required", form.experience_required);
      formData.append("is_active", form.is_active);
      if (form.jd_file) {
        formData.append("jd_file", form.jd_file);
      }

      await api.post("/recruitment/jobs/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadJobs();
      resetForm();
      setStatus("Job opening saved.");
    } catch {
      setError("Failed to save the job opening.");
      setStatus("");
    } finally {
      setSaving(false);
    }
  };

  const totalSkills = jobs.reduce((count, job) => count + (job.extracted_skills?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Recruitment Hub</h2>
          <p className="mt-2 text-slate-500">Create job openings, upload JD files, and store extracted skills for screening.</p>
        </div>
        <Button onClick={() => setShowForm((current) => !current)}>{showForm ? "Close New Job Opening" : "New Job Opening"}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Open Jobs", String(jobs.filter((job) => job.is_active).length)],
          ["Total Jobs", String(jobs.length)],
          ["Stored Skills", String(totalSkills)],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      {showForm ? (
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">New Job Opening</h3>
              <p className="text-sm text-slate-500">Upload the JD, then manually add skills that should be tracked in screening.</p>
            </div>
            <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">JD Upload Enabled</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Job title" />
            <Select value={form.department} onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))}>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </Select>
            <Input
              value={form.experience_required}
              onChange={(e) => setForm((current) => ({ ...current, experience_required: e.target.value }))}
              placeholder="Experience required"
            />
            <Select value={form.is_active} onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.value }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Upload JD</p>
              <Input type="file" accept=".pdf" onChange={(e) => setForm((current) => ({ ...current, jd_file: e.target.files?.[0] ?? null }))} />
              <p className="text-xs text-slate-500">The uploaded JD will be read, stored, and used to extract skills into PostgreSQL.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Manually Type Skills</p>
              <Textarea
                value={form.required_skills}
                onChange={(e) => setForm((current) => ({ ...current, required_skills: e.target.value }))}
                placeholder="Example: Python, Django, REST APIs, PostgreSQL"
                className="min-h-28"
              />
              <p className="text-xs text-slate-500">Separate skills with commas, line breaks, or semicolons.</p>
            </div>
          </div>

          <Textarea
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            placeholder="Job description"
            className="min-h-36"
          />

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {status ? <p className="text-sm text-slate-500">{status}</p> : null}

          <div className="flex gap-3">
            <Button type="button" onClick={saveJob} disabled={saving}>
              {saving ? "Saving..." : "Save Job Opening"}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {jobs.map((job) => (
          <Card key={job.id} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <p className="text-sm text-slate-500">
                  {job.department} · {job.experience_required}
                </p>
              </div>
              <Badge className={job.is_active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}>
                {job.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Manual Skills</p>
              <SkillPills skills={job.required_skills.split(/[,;\n]+/).map((skill) => skill.trim()).filter(Boolean)} />
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Extracted JD Skills</p>
              <SkillPills skills={job.extracted_skills ?? []} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Description</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{job.description || "No job description provided."}</p>
            </div>

            {job.jd_text ? (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Uploaded JD Text</p>
                <p className="mt-2 max-h-32 overflow-y-auto rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  {job.jd_text}
                </p>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
