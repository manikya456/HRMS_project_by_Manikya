import { useMemo, useState } from "react";
import { Bot, MessageCircle, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  sources?: string[];
};

export function HRChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const welcomeMessage = useMemo<ChatMessage>(() => {
    const name = user?.first_name || user?.employee_profile?.full_name || user?.username || "there";
    return {
      role: "assistant",
      content: `Hi ${name}. I'm your HR chatbot. Ask me about leave, attendance, payroll, performance, recruitment, or your HRMS details.`,
    };
  }, [user?.first_name, user?.employee_profile?.full_name, user?.username]);

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  const sendMessage = async () => {
    const cleaned = message.trim();
    if (!cleaned || sending) return;

    const nextMessages = [...messages, { role: "user" as const, content: cleaned }];
    setMessages(nextMessages);
    setMessage("");
    setSending(true);

    try {
      const history = nextMessages.slice(-8).map((item) => ({
        role: item.role,
        content: item.content,
      }));
      const { data } = await api.post("/core/hr-chat/", {
        message: cleaned,
        history,
      });
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data?.answer || "I could not prepare a response right now.",
          sources: data?.sources || [],
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "I could not reach the HR chatbot right now. Please try again shortly.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">HR Chatbot</p>
                <p className="text-xs text-slate-500">HR help, policies, and your details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900"
              aria-label="Close HR chatbot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    item.role === "user"
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  <p>{item.content}</p>
                  {item.sources?.length ? (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Sources: {item.sources.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  Thinking...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-end gap-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={2}
                placeholder="Ask about leave, payroll, attendance, policy, or your HR details..."
                className="min-h-[72px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-sky-500/10"
              />
              <Button onClick={() => void sendMessage()} disabled={!message.trim() || sending} className="h-12 w-12 rounded-2xl p-0">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)] transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 dark:bg-slate-200">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span>HR Chatbot</span>
      </button>
    </div>
  );
}
