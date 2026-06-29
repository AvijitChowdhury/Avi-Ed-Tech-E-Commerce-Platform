import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fromNow } from "@/lib/format";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/chat")({ component: ChatInbox });

type Session = { id: string; guest_name: string; guest_email: string | null; last_message_at: string; unread_admin: number; status: string };
type Msg = { id: string; sender: "user" | "admin" | "system"; body: string; created_at: string };

function ChatInbox() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const loadSessions = () =>
    supabase.from("chat_sessions").select("id, guest_name, guest_email, last_message_at, unread_admin, status").order("last_message_at", { ascending: false }).then(({ data }) => setSessions((data as any) ?? []));

  useEffect(() => {
    loadSessions();
    const ch = supabase
      .channel("admin-chat-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, loadSessions)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as any;
        if (m.sender === "user") {
          if (enabledRef.current && audioRef.current) audioRef.current.play().catch(() => {});
          toast.message(`New message from a customer`, { description: m.body.slice(0, 100) });
        }
        if (active && m.session_id === active) setMsgs((p) => [...p, m]);
        loadSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    supabase.from("chat_messages").select("id, sender, body, created_at").eq("session_id", active).order("created_at").then(({ data }) => {
      setMsgs((data as any) ?? []);
      supabase.from("chat_sessions").update({ unread_admin: 0 }).eq("id", active).then(() => loadSessions());
    });
  }, [active]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }); }, [msgs.length]);

  // favicon dot when there are unread
  useEffect(() => {
    const totalUnread = sessions.reduce((s, x) => s + (x.unread_admin || 0), 0);
    if (typeof document === "undefined") return;
    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") ?? document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>
      <rect width='32' height='32' rx='8' fill='%23${totalUnread > 0 ? "ef4444" : "06b6d4"}'/>
      <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Inter' font-weight='800' font-size='16' fill='white'>${totalUnread > 0 ? totalUnread : "A"}</text>
    </svg>`;
    link.href = `data:image/svg+xml,${encodeURIComponent(svg).replace(/%2523/g, "%23")}`;
    document.head.appendChild(link);
  }, [sessions]);

  const enableSound = () => {
    enabledRef.current = true;
    audioRef.current?.play().then(() => audioRef.current?.pause()).catch(() => {});
  };

  const send = async () => {
    if (!active || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    await supabase.from("chat_messages").insert({ session_id: active, sender: "admin", body });
    supabase.from("chat_sessions").update({ unread_user: 0 }).eq("id", active).then(() => {});
  };

  return (
    <div className="h-[calc(100vh-4rem)] grid grid-cols-[300px_1fr] gap-4" onClick={enableSound}>
      <audio ref={audioRef} src="/notify.wav" preload="auto" />
      <div className="card-elevated rounded-2xl overflow-y-auto">
        <div className="p-3 border-b border-border font-semibold">Conversations</div>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`w-full text-left p-3 border-b border-border hover:bg-muted/40 ${active === s.id ? "bg-muted" : ""}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="font-medium truncate">{s.guest_name}</div>
              {s.unread_admin > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 h-5 min-w-5 flex items-center justify-center">{s.unread_admin}</span>}
            </div>
            <div className="text-xs text-muted-foreground truncate">{s.guest_email}</div>
            <div className="text-xs text-muted-foreground">{fromNow(s.last_message_at)}</div>
          </button>
        ))}
        {!sessions.length && <div className="p-6 text-center text-muted-foreground text-sm">No chats yet.</div>}
      </div>

      <div className="card-elevated rounded-2xl flex flex-col overflow-hidden">
        {active ? (
          <>
            <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${m.sender === "admin" ? "ml-auto gradient-primary-bg text-primary-foreground" : m.sender === "system" ? "mx-auto bg-muted text-muted-foreground text-xs italic" : "bg-secondary text-secondary-foreground"}`}>
                  {m.body}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Type a reply..." className="resize-none min-h-10 max-h-32" />
              <Button onClick={send} className="gradient-primary-bg text-primary-foreground"><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
}
