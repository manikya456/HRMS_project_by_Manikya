import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

type Message = { role: "user" | "assistant"; message: string };

export default function RecruitmentPage() {
  const [candidateId, setCandidateId] = useState("1");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([{ role: "assistant", message: "Hi, I can answer questions about the role, required skills, salary range, and interview process." }]);
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const outgoing = { role: "user" as const, message };
    setMessages((current) => [...current, outgoing]);
    setLoading(true);
    try {
      const { data } = await api.post("/recruitment/chat/ask/", {
        candidate_id: Number(candidateId),
        message,
      });
      setMessages(
        data.conversation.map((entry: { role: "user" | "assistant"; message: string }) => ({
          role: entry.role,
          message: entry.message,
        })),
      );
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Recruitment Hub</h2>
          <p className="mt-2 text-slate-500">Job openings, candidate pipeline, chatbot, and interview automation.</p>
        </div>
        <Button>New Job Opening</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Open Positions", "18"],
          ["Applicants", "124"],
          ["Screens Completed", "56"],
          ["Interviews Scheduled", "36"],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-semibold">Recruiter Assistant Chatbot</h3>
        <p className="mt-2 text-sm text-slate-500">ChatGPT-style interface powered by Ollama Llama 3 will be embedded here.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 h-80 overflow-y-auto space-y-3">
            {messages.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={
                  entry.role === "user"
                    ? "ml-auto max-w-[80%] rounded-2xl bg-sky-500 text-white px-4 py-3 text-sm"
                    : "max-w-[80%] rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
                }
              >
                {entry.message}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Input value={candidateId} onChange={(event) => setCandidateId(event.target.value)} placeholder="Candidate ID" />
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about salary, skills, process..." />
            <Button className="w-full" onClick={sendMessage} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
