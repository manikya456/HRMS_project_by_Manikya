import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import api from "@/lib/api";

type Result = {
  skill_match_percentage: number;
  extracted_skills: string[];
  missing_skills: string[];
  recommendation: string;
  ai_summary: string;
};

type Job = {
  id: number;
  title: string;
  department: string;
  required_skills: string;
};

type FormValues = {
  name: string;
  email: string;
  phone: string;
  applied_position: string;
  resume: FileList;
};

export default function ResumeScreeningPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    api.get("/recruitment/jobs/")
      .then((response) => setJobs(response.data.results ?? response.data))
      .catch(() => setJobs([]));
  }, []);

  const onSubmit = async (values: FormValues) => {
    setStatus("Uploading resume...");
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("email", values.email);
    formData.append("phone", values.phone);
    formData.append("applied_position", values.applied_position);
    formData.append("resume", values.resume[0]);

    const candidate = await api.post("/recruitment/candidates/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setResult(candidate.data.evaluation ?? null);
    setStatus("Evaluation complete.");
    reset();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">AI Resume Screening</h2>
        <p className="mt-2 text-slate-500">Upload a PDF resume and generate a skill-match score with recommendations.</p>
      </div>
      <Card className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-4 rounded-3xl border border-dashed border-slate-300 p-8 dark:border-slate-700" onSubmit={handleSubmit(onSubmit)}>
          <p className="text-sm text-slate-500">Create candidate and screen a resume PDF</p>
          <Input placeholder="Candidate name" {...register("name", { required: true })} />
          <Input placeholder="Email" {...register("email", { required: true })} />
          <Input placeholder="Phone" {...register("phone")} />
          <Select {...register("applied_position", { required: true })}>
            <option value="">Select job opening</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} - {job.department}
              </option>
            ))}
          </Select>
          <Input type="file" accept=".pdf" {...register("resume", { required: true })} />
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Upload and Screen"}</Button>
          <p className="text-xs text-slate-500">{status}</p>
        </form>
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-glow">
          {result ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Evaluation Result</p>
                  <h3 className="mt-2 text-2xl font-semibold">Match Score: {result.skill_match_percentage}%</h3>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-300">{result.recommendation}</Badge>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-300 font-semibold">Strengths</p>
                  <p className="mt-2 text-sm text-slate-200">{result.extracted_skills.join(", ") || "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-300 font-semibold">Missing Skills</p>
                  <p className="mt-2 text-sm text-slate-200">{result.missing_skills.join(", ") || "N/A"}</p>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-300">{result.ai_summary}</p>
            </>
          ) : (
            <div className="h-full grid place-items-center rounded-3xl border border-dashed border-white/15 p-8 text-center text-slate-300">
              The evaluation card will appear here after the backend returns the match analysis.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
