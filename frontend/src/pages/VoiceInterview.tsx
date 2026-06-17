import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Mic2, Sparkles, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function getRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return AUDIO_MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function getAudioFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function speak(
  text: string,
  handlers?: {
    onStart?: () => void;
    onEnd?: () => void;
  },
) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onstart = () => handlers?.onStart?.();
  utterance.onend = () => handlers?.onEnd?.();
  utterance.onerror = () => handlers?.onEnd?.();
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
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [browserTranscript, setBrowserTranscript] = useState("");
  const [transcript, setTranscript] = useState("");
  const [currentReview, setCurrentReview] = useState<AnswerReview | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const browserTranscriptRef = useRef("");
  const currentQuestion = useMemo(
    () => session?.questions?.[session.current_question_index] ?? "",
    [session],
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.id) === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );
  const reviews = session?.answer_reviews ?? [];
  const finalReview = session?.final_review || "";

  const getSpeechRecognitionCtor = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: BrowserSpeechRecognitionCtor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    };
    return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
  };

  const supportsBrowserSpeechRecognition = Boolean(getSpeechRecognitionCtor());

  const cleanupAudioMonitoring = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startAudioMonitoring = (stream: MediaStream) => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      if (!analyserRef.current) {
        return;
      }
      analyserRef.current.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let index = 0; index < data.length; index += 1) {
        const normalized = (data[index] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setAudioLevel(Math.min(100, Math.round(rms * 220)));
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

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
      speak(currentQuestion, {
        onStart: () => setAiSpeaking(true),
        onEnd: () => setAiSpeaking(false),
      });
    }
  }, [currentQuestion]);

  useEffect(() => {
    if (finalReview) {
      speak(finalReview, {
        onStart: () => setAiSpeaking(true),
        onEnd: () => setAiSpeaking(false),
      });
    }
  }, [finalReview]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      stopSpeechRecognition();
      cleanupAudioMonitoring();
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
    setStatus("Generating fresh JD-aware interview questions...");
    setTranscript("");
    setCurrentReview(null);
    try {
      const payload = selectedJob ? { role, job_opening_id: selectedJob.id } : { role };
      const { data } = await api.post("/recruitment/interviews/start/", payload);
      setSession(data);
      setStatus("Interview ready. The first question has been asked.");
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
    const mimeType = blob.type || "audio/webm";
    const extension = getAudioFileExtension(mimeType);
    const file = new File([blob], `answer.${extension}`, { type: mimeType });
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
      } else if (data.next_question) {
        setStatus("Answer saved. Next question is ready.");
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.detail ||
        (typeof error?.response?.data === "string" ? error.response.data : "") ||
        "Unable to transcribe or score the answer right now.";
      setStatus(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswerText = async (answer: string, sourceLabel: string) => {
    if (!session?.id) return;
    const cleanedAnswer = answer.trim();
    if (!cleanedAnswer) {
      setStatus(`No ${sourceLabel} transcript was captured. Please try again or use typed answer.`);
      return;
    }

    setLoading(true);
    setStatus(`Scoring your ${sourceLabel} answer...`);
    try {
      const { data } = await api.post(`/recruitment/interviews/${session.id}/submit_answer/`, {
        answer: cleanedAnswer,
      });
      setSession(data.session);
      setTranscript(cleanedAnswer);
      setCurrentReview(data.current_review ?? null);
      if (data.is_complete) {
        setStatus("Interview complete. Review generated.");
      } else if (data.next_question) {
        setStatus("Answer saved. Next question is ready.");
      }
    } catch (error: any) {
      const backendMessage =
        error?.response?.data?.detail ||
        (typeof error?.response?.data === "string" ? error.response.data : "") ||
        `Unable to score the ${sourceLabel} answer right now.`;
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
      streamRef.current = stream;
      mediaChunksRef.current = [];
      browserTranscriptRef.current = "";
      setBrowserTranscript("");
      const mimeType = getRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      startAudioMonitoring(stream);
      const SpeechRecognitionCtor = getSpeechRecognitionCtor();
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          let nextTranscript = "";
          for (let index = 0; index < event.results.length; index += 1) {
            nextTranscript += `${event.results[index][0]?.transcript ?? ""} `;
          }
          const cleanedTranscript = nextTranscript.trim();
          browserTranscriptRef.current = cleanedTranscript;
          setBrowserTranscript(cleanedTranscript);
        };
        recognition.onerror = () => {
          recognitionRef.current = null;
        };
        recognition.onend = () => {
          recognitionRef.current = null;
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stopSpeechRecognition();
        cleanupAudioMonitoring();
        if (browserTranscriptRef.current.trim()) {
          await submitAnswerText(browserTranscriptRef.current, "voice");
          return;
        }
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await sendAudio(blob);
      };
      recorder.start();
      setRecording(true);
      setStatus(
        SpeechRecognitionCtor
          ? "Recording is live. Speak your answer now. Browser speech recognition is active."
          : "Recording is live. Speak your answer now.",
      );
    } catch (error) {
      stopSpeechRecognition();
      cleanupAudioMonitoring();
      setStatus(getMicErrorMessage(error));
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setRecording(false);
    setStatus("Recording stopped. Uploading your answer for transcription...");
  };

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
                AI Interview
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {session ? `${session.questions.length} questions` : "Role-based interview"}
              </Badge>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">A guided AI interview that listens, evaluates, and moves question by question</h2>
            <p className="max-w-2xl text-slate-600 dark:text-slate-300">
              Pick one of your uploaded JDs, let the assistant ask one question at a time, answer by voice, and get a scored review after each response.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Mode</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">AI Interview</p>
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
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Response Control</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {recording ? "Recording in progress" : "Ready for your answer"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => speak(currentQuestion)} disabled={!currentQuestion} className="gap-2">
                    <Volume2 className="h-4 w-4" />
                    Replay Question
                  </Button>
                  <Button
                    variant={recording ? "primary" : "secondary"}
                    onClick={recording ? stopRecording : startRecording}
                    disabled={!session || loading}
                    className={`gap-2 ${recording ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""}`}
                  >
                    <Mic2 className={`h-4 w-4 ${recording ? "animate-pulse" : ""}`} />
                    {recording ? "Stop Recording" : "Start Recording"}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-150 ${recording ? "bg-emerald-400" : "bg-slate-400"}`}
                      style={{ width: `${recording ? Math.max(audioLevel, 6) : 6}%` }}
                    />
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${recording ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {recording ? "Live" : "Idle"}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Voice</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {aiSpeaking ? "Speaking now" : "Waiting"}
                    </p>
                    <div className="mt-3 flex h-8 items-end gap-1">
                      {[0, 1, 2, 3].map((bar) => (
                        <span
                          key={bar}
                          className={`w-1.5 rounded-full bg-sky-400 transition-all duration-300 ${aiSpeaking ? "animate-bounce" : "opacity-40"}`}
                          style={{ height: aiSpeaking ? `${14 + ((bar % 2) + 1) * 6}px` : "10px", animationDelay: `${bar * 120}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Guidance</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {recording
                        ? "Speak normally, then stop the mic when your answer is complete."
                        : "Press start when you are ready to answer the current question."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Speech Capture</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {supportsBrowserSpeechRecognition ? "Browser transcription available" : "Server transcription fallback"}
                  </p>
                </div>
                <Badge className={supportsBrowserSpeechRecognition ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}>
                  {supportsBrowserSpeechRecognition ? "Direct" : "Fallback"}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {supportsBrowserSpeechRecognition
                  ? "Speech can be converted to text in the browser while you record."
                  : "This browser will upload recorded audio to the backend after recording stops."}
              </p>
              {browserTranscript ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {browserTranscript}
                </p>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Voice-only interview flow</p>
                <p className="mt-1 text-xs text-slate-500">
                  Start recording, speak your answer, then stop the microphone. Your response will be processed automatically and the next question will be asked.
                </p>
              </div>
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
              <h3 className="mt-1 text-2xl font-semibold">{session ? `${session.role} AI Interview` : "Awaiting interview"}</h3>
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
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Current Step</p>
            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              {session
                ? session.current_question_index >= session.questions.length
                  ? "Interview completed."
                  : `Question ${session.current_question_index + 1} of ${session.questions.length}`
                : "Start the interview to begin the question flow."}
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
