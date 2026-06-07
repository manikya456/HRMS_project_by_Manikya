import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Mic2, Sparkles, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

type AnswerReview = {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
};

type InterviewSession = {
  id: number;
  role: string;
  current_question_index: number;
  score: number;
  transcript: string;
  recommendation: string;
  final_review: string;
  final_recommendation: string;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  questions: string[];
  answers: string[];
  answer_reviews: AnswerReview[];
};

type Job = {
  id: number;
  title: string;
  department: string;
  jd_file: string | null;
  is_active: boolean;
};

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function PillList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">None</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {item}
        </span>
      ))}
    </div>
  );
}

function getMicErrorMessage(error: unknown) {
  if (!window.isSecureContext) {
    return "Microphone access needs a secure context. Use https:// or a trusted localhost session.";
  }

  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "Microphone permission was denied. Allow microphone access in the browser site settings and try again.";
      case "NotFoundError":
        return "No microphone was found on this device.";
      case "NotReadableError":
        return "The microphone is already in use by another app or tab.";
      case "SecurityError":
        return "Browser security settings are blocking microphone access.";
      case "AbortError":
        return "Microphone access was interrupted. Please try again.";
      default:
        return `${error.name}: ${error.message || "Unable to access the microphone."}`;
    }
  }

  if (error instanceof Error) {
    return error.message || "Unable to access the microphone.";
  }

  return "Unable to access the microphone.";
}

export default function VoiceInterviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [status, setStatus] = useState("Pick a role and start the interview.");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [currentReview, setCurrentReview] = useState<AnswerReview | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const currentQuestion = useMemo(
    () => session?.questions?.[session.current_question_index] ?? "",
    [session],
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.id) === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  useEffect(() => {
    api
      .get("/recruitment/jobs/")
      .then((response) => {
        const items = response.data.results ?? response.data;
        setJobs(items);
        if (items?.length) {
          setSelectedJobId(String(items[0].id));
        }
      })
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    if (currentQuestion) {
      speak(currentQuestion);
    }
  }, [currentQuestion]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const startInterview = async () => {
    const role = selectedJob?.title || selectedJobId;
    if (!role) {
      setStatus("Please select a JD or role first.");
      return;
    }
    setLoading(true);
    setStatus("Generating 3 interview questions...");
    setTranscript("");
    setTypedAnswer("");
    setCurrentReview(null);
    try {
      const { data } = await api.post("/recruitment/interviews/start/", { role });
      setSession(data);
      setStatus("Interview ready. The first question has been asked.");
      if (data.questions?.[0]) {
        speak(data.questions[0]);
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.detail ||
        (typeof error?.response?.data === "string" ? error.response.data : "") ||
        "Unable to start the interview right now.";
      setStatus(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendAudio = async (blob: Blob) => {
    if (!session?.id) return;
    const formData = new FormData();
    const file = new File([blob], "answer.webm", { type: blob.type || "audio/webm" });
    formData.append("audio", file);

    setLoading(true);
    setStatus("Transcribing audio with Whisper and scoring the answer...");
    try {
      const { data } = await api.post(`/recruitment/interviews/${session.id}/transcribe/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSession(data.session);
      setTranscript(data.transcript ?? "");
      setCurrentReview(data.current_review ?? null);
      if (data.is_complete) {
        setStatus("Interview complete. Review generated.");
        if (data.session?.final_review) {
          speak(data.session.final_review);
        }
      } else if (data.next_question) {
        setStatus("Answer saved. Next question is ready.");
        speak(data.next_question);
      }
    } catch {
      setStatus("Unable to transcribe or score the answer right now.");
    } finally {
      setLoading(false);
    }
  };

  const submitTypedAnswer = async () => {
    if (!session?.id) {
      setStatus("Start the interview first.");
      return;
    }
    if (!typedAnswer.trim()) {
      setStatus("Type an answer before submitting.");
      return;
    }

    setLoading(true);
    setStatus("Scoring your typed answer...");
    try {
      const { data } = await api.post(`/recruitment/interviews/${session.id}/submit_answer/`, {
        answer: typedAnswer.trim(),
      });
      setSession(data.session);
      setTranscript(typedAnswer.trim());
      setCurrentReview(data.current_review ?? null);
      setTypedAnswer("");
      if (data.is_complete) {
        setStatus("Interview complete. Review generated.");
        if (data.session?.final_review) {
          speak(data.session.final_review);
        }
      } else if (data.next_question) {
        setStatus("Answer saved. Next question is ready.");
        speak(data.next_question);
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.detail ||
        (typeof error?.response?.data === "string" ? error.response.data : "") ||
        "Unable to score the typed answer right now.";
      setStatus(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (!session?.id || recording) return;
    if (!window.isSecureContext) {
      setStatus("Microphone access needs a secure context. Use https:// or a trusted localhost session.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Your browser does not support microphone recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await sendAudio(blob);
      };
      recorder.start();
      setRecording(true);
      setStatus("Recording. Speak your answer now.");
    } catch (error) {
      setStatus(getMicErrorMessage(error));
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setRecording(false);
  };

  const reviews = session?.answer_reviews ?? [];
  const finalReview = session?.final_review || "";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="absolute -bottom-10 left-1/3 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Voice Interview
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {session ? `${session.questions.length} questions` : "Role-based interview"}
              </Badge>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">A cleaner, guided interview flow with voice and typed fallback</h2>
            <p className="max-w-2xl text-slate-600 dark:text-slate-300">
              Pick one of your uploaded JDs, let the system speak each question, answer by mic or text, and get a scored review after every response.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Mode</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Voice + Text</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{session ? "Active" : "Ready"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="space-y-5 border-slate-200/80 shadow-sm dark:border-slate-800">
          <div>
            <h3 className="text-lg font-semibold">Interview Setup</h3>
            <p className="text-sm text-slate-500">Choose the role and start the interview.</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Available JD / Role</p>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-sky-500/10"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              {jobs.length ? (
                jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.department}
                  </option>
                ))
              ) : (
                <option value="">No JD available</option>
              )}
            </select>
            {selectedJob ? (
              <p className="text-xs text-slate-500">
                Using {selectedJob.title} from the recruitment JD list.
              </p>
            ) : (
              <p className="text-xs text-slate-500">Choose one of the uploaded JDs to begin the interview.</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={startInterview} disabled={loading} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {loading && !session ? "Generating..." : "Start Interview"}
            </Button>
            <Button variant="secondary" onClick={() => setSession(null)} disabled={loading} className="gap-2">
              Reset
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-300">
              <Mic2 className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.25em]">Current Question</p>
            </div>
            <p className="mt-3 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
              {currentQuestion || "Start the interview to generate questions."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => speak(currentQuestion)} disabled={!currentQuestion} className="gap-2">
                <Volume2 className="h-4 w-4" />
                Replay Question
              </Button>
              <Button
                variant={recording ? "primary" : "secondary"}
                onClick={recording ? stopRecording : startRecording}
                disabled={!session || loading}
                className="gap-2"
              >
                <Mic2 className={`h-4 w-4 ${recording ? "animate-pulse" : ""}`} />
                {recording ? "Stop Recording" : "Start Recording"}
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <Textarea
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder="Type your answer here if microphone access is unavailable..."
                className="min-h-28"
              />
              <div className="flex gap-3">
                <Button onClick={submitTypedAnswer} disabled={!session || loading} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Submit Typed Answer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTypedAnswer("");
                    setStatus("Typed answer cleared.");
                  }}
                  disabled={loading || !typedAnswer}
                >
                  Clear
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                If the microphone is unavailable, type your answer here and submit it without interrupting the interview.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="mt-2 text-sm text-slate-500">{status}</p>
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Interview Review</p>
              <h3 className="mt-1 text-2xl font-semibold">{session ? `${session.role} Interview` : "Awaiting interview"}</h3>
            </div>
            {session ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{session.recommendation || "In progress"}</Badge> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Overall Score</p>
              <div className="mt-3 text-3xl font-semibold">{session?.score ?? 0}%</div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Communication</p>
              <div className="mt-3 text-3xl font-semibold">{session?.communication_score ?? 0}%</div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Technical</p>
              <div className="mt-3 text-3xl font-semibold">{session?.technical_score ?? 0}%</div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Confidence</p>
              <div className="mt-3 text-3xl font-semibold">{session?.confidence_score ?? 0}%</div>
            </div>
          </div>

          {currentReview ? (
            <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Latest Answer Review</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{currentReview.feedback}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Strengths</p>
                  <div className="mt-2">
                    <PillList items={currentReview.strengths} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gaps</p>
                  <div className="mt-2">
                    <PillList items={currentReview.gaps} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Transcript</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
              {transcript || "The transcript will appear here after each audio answer is processed."}
            </p>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Questions</p>
            <div className="mt-3 space-y-3">
              {(session?.questions ?? []).map((question, index) => {
                const active = index === session?.current_question_index;
                return (
                  <div
                    key={`${question}-${index}`}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      active ? "bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:text-sky-100" : "bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"
                    }`}
                  >
                    <span className="mr-2 font-semibold">Q{index + 1}.</span>
                    {question}
                  </div>
                );
              })}
            </div>
          </div>

          {finalReview ? (
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-sky-300">Final Review</p>
              <p className="mt-3 leading-7 text-white/80">{finalReview}</p>
              <p className="mt-4 text-sm text-sky-100">
                Recommendation: <span className="font-semibold">{session?.final_recommendation || session?.recommendation || "Pending"}</span>
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
