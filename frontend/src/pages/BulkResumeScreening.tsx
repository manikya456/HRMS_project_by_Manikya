import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

type Job = {
  id: number;
  title: string;
  department: string;
  description: string;
  jd_text: string;
  jd_file: string | null;
  experience_required: string;
  is_active: boolean;
};

type StoredResume = {
  id: number;
  file_name: string;
  match_percentage: number;
  recommendation: string;
  status: string;
  analysis: string;
  created_at: string;
  job_title?: string;
  job_department?: string;
};

const statusStyles: Record<string, string> = {
  Shortlisted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Review: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function ResumeCard({ resume }: { resume: StoredResume }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold">{resume.file_name}</p>
          <p className="text-xs text-slate-500">Stored resume</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusStyles[resume.status] ?? "bg-slate-100 text-slate-700"}>{resume.status}</Badge>
          <div className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white">{resume.match_percentage}%</div>
        </div>
      </div>
    </div>
  );
}

export default function BulkResumeScreeningPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [storedResumes, setStoredResumes] = useState<StoredResume[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data } = await api.get("/recruitment/jobs/");
      const items = data.results ?? data;
      setJobs(items);
      if (!selectedJobId && items.length > 0) {
        setSelectedJobId(items[0].id);
        setSelectedJob(items[0]);
      }
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadMatches = async (jobId: number) => {
    setLoadingResumes(true);
    try {
      const { data } = await api.get("/recruitment/resume-matches/", {
        params: { job_opening: jobId },
      });
      setStoredResumes(data.results ?? data);
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadJobs().catch(() => setJobs([]));
    api
      .get("/recruitment/resume-matches/")
      .then((response) => setStoredResumes(response.data.results ?? response.data))
      .catch(() => setStoredResumes([]));
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;
    const nextJob = jobs.find((job) => job.id === selectedJobId) ?? null;
    setSelectedJob(nextJob);
    if (nextJob) {
      loadMatches(nextJob.id).catch(() => setStoredResumes([]));
    }
  }, [selectedJobId, jobs]);

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const value = search.trim().toLowerCase();
        if (!value) return true;
        return job.title.toLowerCase().includes(value) || job.department.toLowerCase().includes(value);
      }),
    [jobs, search],
  );

  const uploadResumes = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    setMessage("Uploading resumes to the shared pool...");
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("resumes", file));
      await api.post("/recruitment/stored-resumes/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await api.post("/recruitment/resume-matches/rebuild/");
      if (selectedJobId) {
        await loadMatches(selectedJobId);
      }
      setMessage("Resumes uploaded successfully.");
    } catch {
      setMessage("Unable to upload resumes right now.");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const clearStoredResumes = async () => {
    const confirmed = window.confirm("Delete all uploaded resumes and their saved match data? This cannot be undone.");
    if (!confirmed) return;

    setClearing(true);
    setMessage("Clearing stored resumes...");
    try {
      await api.post("/recruitment/stored-resumes/clear/");
      setStoredResumes([]);
      setMessage("Stored resumes cleared. You can upload fresh resumes now.");
      if (selectedJobId) {
        await loadMatches(selectedJobId);
      }
    } catch {
      setMessage("Unable to clear stored resumes right now.");
    } finally {
      setClearing(false);
    }
  };

  const selectedJdFileName = selectedJob?.jd_file ? selectedJob.jd_file.split("/").pop() ?? selectedJob.jd_file : "JD file";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Bulk Resume Screening</h2>
          <p className="mt-2 text-slate-500">Select a JD on the left and the right side will score every stored resume against it.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={clearStoredResumes} disabled={clearing || uploading}>
            {clearing ? "Clearing..." : "Clear All"}
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading || clearing}>
            {uploading ? "Uploading..." : "Add Resumes"}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(event) => uploadResumes(event.target.files)}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Uploaded JD List</h3>
            <p className="text-sm text-slate-500">Choose a JD to compare every stored resume against it.</p>
          </div>
          <Input placeholder="Search JD..." value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {loadingJobs ? (
              <p className="text-sm text-slate-500">Loading job openings...</p>
            ) : filteredJobs.length ? (
              filteredJobs.map((job) => {
                const active = selectedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedJobId(job.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedJobId(job.id);
                      }
                    }}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-xs text-slate-500">{job.department}</p>
                        <p className="mt-1 text-xs text-slate-400">{job.jd_file ? job.jd_file.split("/").pop() : "No JD file uploaded"}</p>
                      </div>
                      <Badge className={job.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                        {job.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">{job.experience_required}</p>

                    <div className="mt-4 flex items-center gap-3">
                      <Button type="button" className="rounded-full" variant="secondary" onClick={() => setSelectedJobId(job.id)}>
                        Match
                      </Button>
                      <Button type="button" className="rounded-full" variant="ghost" onClick={() => setSelectedJobId(job.id)}>
                        View
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No matching job descriptions found.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Matching Candidate Profiles</h3>
              <p className="text-sm text-slate-500">
                {selectedJob ? `${selectedJob.title} - ${selectedJob.department}` : "Select a JD to populate this list."}
              </p>
            </div>
            <div className="rounded-full bg-slate-50 px-4 py-2 text-sm text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              {storedResumes.length} resume{storedResumes.length === 1 ? "" : "s"}
            </div>
          </div>

          {selectedJob ? (
            <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Selected JD</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedJdFileName}</p>
                <Badge className={selectedJob.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                  {selectedJob.department}
                </Badge>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-slate-500">{message}</p>

          <div className="space-y-4">
            {loadingResumes ? (
              <p className="text-sm text-slate-500">Loading resumes...</p>
            ) : storedResumes.length ? (
              storedResumes
                .slice()
                .sort((a, b) => b.match_percentage - a.match_percentage)
                .map((resume) => <ResumeCard key={resume.id} resume={resume} />)
            ) : (
              <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-950/20">
                No stored resumes yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
