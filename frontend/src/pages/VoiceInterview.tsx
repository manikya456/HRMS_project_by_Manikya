import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

export default function VoiceInterviewPage() {
  const [candidateId, setCandidateId] = useState("1");
  const [session, setSession] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [transcript, setTranscript] = useState("");

  const startInterview = async () => {
    const { data } = await api.post("/recruitment/interviews/start/", { candidate_id: Number(candidateId) });
    setSession(data);
  };

  const submitAnswer = async () => {
    if (!session?.id || !answer.trim()) return;
    const { data } = await api.post(`/recruitment/interviews/${session.id}/submit_answer/`, { answer });
    setSession(data);
    setAnswer("");
  };

  const uploadAudio = async () => {
    if (!session?.id) return;
    const formData = new FormData();
    const input = document.getElementById("voice-audio") as HTMLInputElement | null;
    if (!input?.files?.[0]) return;
    formData.append("audio", input.files[0]);
    const { data } = await api.post(`/recruitment/interviews/${session.id}/transcribe/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setSession(data.session);
    setTranscript(data.transcript);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">AI Voice Interview</h2>
        <p className="mt-2 text-slate-500">TTS asks, mic captures responses, Whisper transcribes, and Llama evaluates.</p>
      </div>
      <Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Current Question</p>
            <h3 className="mt-3 text-2xl font-semibold">{session?.questions?.[session.answers?.length ?? 0] ?? "Start the interview to load the first question."}</h3>
            <div className="mt-4 space-y-3">
              <Input value={candidateId} onChange={(event) => setCandidateId(event.target.value)} placeholder="Candidate ID" />
              <Button onClick={startInterview}>Start Interview</Button>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={submitAnswer}>Submit Text Answer</Button>
              <Button variant="secondary" onClick={uploadAudio}>Transcribe Audio</Button>
            </div>
            <Input id="voice-audio" type="file" accept="audio/*" className="mt-4" />
            <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="mt-4 min-h-28" placeholder="Type candidate answer here or use uploaded audio..." />
            {transcript ? <p className="mt-4 text-sm text-slate-300">Last transcript: {transcript}</p> : null}
          </div>
          <div className="rounded-3xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
            <p className="font-semibold">Interview Report</p>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p>Communication Score: {session?.communication_score ?? 0}</p>
              <p>Technical Score: {session?.technical_score ?? 0}</p>
              <p>Confidence Score: {session?.confidence_score ?? 0}</p>
              <p>Final Recommendation: {session?.recommendation ?? "Awaiting responses"}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
