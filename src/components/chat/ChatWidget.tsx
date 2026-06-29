import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";

const KEY = "aviedu_chat_session";

type Msg = { id: string; sender: "user" | "admin" | "system"; body: string; created_at: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const enabledRef = useRef(false);
  const { user } = useAuth();

  // hydrate session
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (saved) setSessionId(saved);
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email]);

  // load messages + subscribe
  useEffect(() => {
    if (!sessionId) return;
    supabase
      .from("chat_messages")
      .select("id, sender, body, created_at")
      .eq("session_id", sessionId)
      .order("created_at")
      .then(({ data }) => setMsgs((data as any) ?? []));

    const ch = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const m = payload.new as any;
          setMsgs((prev) => [...prev, m]);
          if (m.sender === "admin" && !open) {
            setUnread((u) => u + 1);
            if (enabledRef.current && audioRef.current) audioRef.current.play().catch(() => {});
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [open, msgs.length]);

  const enableSound = () => {
    enabledRef.current = true;
    audioRef.current?.play().then(() => audioRef.current?.pause()).catch(() => {});
  };

  const startChat = async () => {
    if (!name.trim() || !email.trim()) return;
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ guest_name: name.trim(), guest_email: email.trim(), user_id: user?.id ?? null })
      .select("id")
      .single();
    if (error || !data) return;
    localStorage.setItem(KEY, data.id);
    setSessionId(data.id);
    enableSound();
  };

  const send = async () => {
    if (!draft.trim() || !sessionId) return;
    const body = draft.trim();
    setDraft("");
    await supabase.from("chat_messages").insert({ session_id: sessionId, sender: "user", body });
  };

  return (
    <>
      <audio ref={audioRef} src="/notify.wav" preload="auto" />
      <button
        onClick={() => { setOpen((o) => !o); enableSound(); }}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full gradient-primary-bg glow-primary flex items-center justify-center text-primary-foreground transition-transform hover:scale-105"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[520px] max-h-[80vh] card-elevated rounded-2xl flex flex-col overflow-hidden animate-fade-in-up">
          <div className="px-4 py-3 gradient-primary-bg text-primary-foreground">
            <div className="font-semibold">Live support</div>
            <div className="text-xs opacity-90">Typically replies in a few minutes</div>
          </div>

          {!sessionId ? (
            <div className="p-4 flex flex-col gap-3 flex-1">
              <p className="text-sm text-muted-foreground">Tell us who you are and we'll get back to you fast.</p>
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button onClick={startChat} className="gradient-primary-bg text-primary-foreground">Start chat</Button>
            </div>
          ) : (
            <>
              <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : m.sender === "system"
                        ? "mx-auto bg-muted text-muted-foreground text-xs italic"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-2 flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="resize-none min-h-10 max-h-24"
                />
                <Button onClick={send} size="icon" className="gradient-primary-bg text-primary-foreground shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
