import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import type { FormEvent } from "react";

type Result = {
  skill_match_percentage: number;
  matched_skills: string[];
  extracted_skills: string[];
  missing_skills: string[];
  recommendation: string;
  status: string;
  ai_summary: string;
};

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

type FormValues = {
  name: string;
  email: string;
  phone: string;
  applied_position: string;
  resume: FileList;
};

const statusStyles: Record<string, string> = {
  Shortlisted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Review: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function SkillPills({ skills }: { skills: string[] }) {
  if (!skills.length) {
    return <p className="text-sm text-slate-500">N/A</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {skill}
        </span>
      ))}
    </div>
  );
}

export default function ResumeScreeningPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormValues>({
    name: "",
    email: "",
    phone: "",
    applied_position: "",
    resume: {} as FileList,
  });

  useEffect(() => {
    api
      .get("/recruitment/jobs/")
      .then((response) => setJobs(response.data.results ?? response.data))
      .catch(() => setJobs([]));
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === Number(selectedJobId || form.applied_position)),
    [jobs, selectedJobId, form.applied_position],
  );

  const setField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.resume?.[0] || !form.applied_position) return;

    setLoading(true);
    setStatus("Uploading resume and running AI screening...");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("applied_position", form.applied_position);
      formData.append("resume", form.resume[0]);

      const candidate = await api.post("/recruitment/candidates/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(candidate.data.evaluation ?? null);
      setStatus("Screening completed successfully.");
    } catch {
      setStatus("Unable to screen this resume right now.");
    } finally {
      setLoading(false);
    }
  };

  const manualSkills = selectedJob?.required_skills.split(/[,;\n]+/).map((skill) => skill.trim()).filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">AI Resume Screening</h2>
        <p className="mt-2 text-slate-500">Upload a PDF resume, compare it against the selected JD, and review a structured hiring decision.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">Candidate Intake</h3>
            <p className="text-sm text-slate-500">Create the candidate and run screening in one flow.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <Input placeholder="Candidate name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />

            <Select
              value={form.applied_position}
              onChange={(e) => {
                setField("applied_position", e.target.value);
                setSelectedJobId(e.target.value);
              }}
            >
              <option value="">Select job opening</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.department} ({job.extracted_skills?.length || 0} JD skills)
                </option>
              ))}
            </Select>

            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setField("resume", e.target.files as FileList)}
            />

            <Button type="submit" disabled={loading || !form.applied_position}>
              {loading ? "Processing..." : "Upload and Screen"}
            </Button>
            <p className="text-xs text-slate-500">{status}</p>
          </form>

          {selectedJob ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Selected Job</p>
                  <h4 className="mt-1 text-lg font-semibold">{selectedJob.title}</h4>
                </div>
                <Badge className={selectedJob.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-600"}>
                  {selectedJob.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">JD Skills from PostgreSQL</p>
                  <div className="mt-2">
                    <SkillPills skills={selectedJob.extracted_skills ?? []} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Manual Skills</p>
                  <div className="mt-2">
                    <SkillPills skills={manualSkills} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Job Description</p>
                  <Textarea value={selectedJob.description || ""} readOnly className="mt-2 min-h-28" />
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Screening Result</p>
              <h3 className="mt-1 text-2xl font-semibold">Professional Evaluation</h3>
            </div>
            {result ? (
              <Badge className={statusStyles[result.status] ?? "bg-slate-100 text-slate-700"}>{result.status}</Badge>
            ) : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-500 p-5 text-white shadow-soft">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/70">Match Score</p>
                  <div className="mt-3 text-4xl font-semibold">{result.skill_match_percentage}%</div>
                  <p className="mt-2 text-sm text-white/80">Overall compatibility between the resume and the JD.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900/70">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Hiring Recommendation</p>
                  <p className="mt-3 text-xl font-semibold">{result.recommendation}</p>
                  <p className="mt-2 text-sm text-slate-500">Generated from the extracted resume text and job requirements.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900/70">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Status Badge</p>
                  <div className="mt-3">
                    <Badge className={statusStyles[result.status] ?? "bg-slate-100 text-slate-700"}>{result.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Shortlisted, Review, or Rejected.</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Matched Skills</p>
                  <div className="mt-3">
                    <SkillPills skills={result.matched_skills} />
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Missing Skills</p>
                  <div className="mt-3">
                    <SkillPills skills={result.missing_skills} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">AI Analysis</p>
                <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{result.ai_summary}</p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-950/20">
              The detailed screening report will appear here after you upload a resume.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
