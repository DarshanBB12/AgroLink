import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageCircle, Mic, MicOff, Phone, PhoneOff, Search, Send, WifiOff } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorState, PageHeader } from "@/components/common/StateViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSocket } from "@/contexts/SocketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import api, { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ChatUser } from "@/types/api";

interface Message {
  _id: string;
  senderId: string | { _id: string; name: string };
  receiverId: string;
  message: string;
  createdAt: string;
  isDelivered?: boolean;
  isRead: boolean;
}
interface Conversation { user: ChatUser; unread: number; lastMessage: { message: string; createdAt: string } }

const senderOf = (m: Message) => (typeof m.senderId === "string" ? m.senderId : m.senderId._id);
const ROLE_KEY: Record<string, string> = { farmer: "app.roles.farmer", worker: "app.roles.worker", equipment_owner: "app.roles.owner", admin: "app.roles.admin" };

const ChatPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { socket, onlineUsers, isConnected } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const rtc = useWebRTC();
  const role = (user?.role === "equipment_owner" ? "owner" : user?.role || "farmer") as "farmer" | "worker" | "admin" | "owner";

  const paramWith = searchParams.get("with") || searchParams.get("contact");

  const [selected, setSelected] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedId = selected?.id;

  const contacts = useQuery({ queryKey: ["chat-contacts"], queryFn: async () => (await api.get("/users/chat/all")).data.data as ChatUser[] });
  const conversations = useQuery({ queryKey: ["chat-conversations"], queryFn: async () => (await api.get("/messages/conversations")).data.data as Conversation[], refetchInterval: 60000 });

  // Auto-select contact when ?with= query parameter is present
  useEffect(() => {
    if (paramWith && contacts.data && contacts.data.length > 0) {
      const target = contacts.data.find((c) => c.id === paramWith);
      if (target && target.id !== selected?.id) {
        setSelected(target);
      }
    }
  }, [paramWith, contacts.data, selected?.id]);
  const unreadBy = useMemo(() => Object.fromEntries((conversations.data || []).map((c) => [c.user.id, c.unread])), [conversations.data]);
  const isOnline = useCallback((id: string) => onlineUsers.includes(id), [onlineUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (contacts.data || []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.role.includes(q));
    const last = Object.fromEntries((conversations.data || []).map((c) => [c.user.id, new Date(c.lastMessage.createdAt).getTime()]));
    return [...list].sort((a, b) => (last[b.id] || 0) - (last[a.id] || 0) || a.name.localeCompare(b.name));
  }, [contacts.data, conversations.data, search]);

  // Load history for the selected conversation (the API only returns messages between the two participants).
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoadingMessages(true);
    api.get(`/messages/${selectedId}`)
      .then((res) => { if (!cancelled) { setMessages(res.data.messages || []); void qc.invalidateQueries({ queryKey: ["chat-conversations"] }); } })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => !cancelled && setLoadingMessages(false));
    socket?.emit("messages:read", { senderId: selectedId });
    return () => { cancelled = true; };
  }, [selectedId, socket, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const onReceive = (m: Message) => {
      if (senderOf(m) === selectedId) {
        setMessages((p) => [...p, m]);
        socket.emit("messages:read", { senderId: selectedId });
      }
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    };
    const onSent = (m: Message) => {
      if (m.receiverId === selectedId) setMessages((p) => [...p, m]);
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    };
    const onDelivered = (p: { messageId?: string; receiverId?: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          (!p.messageId || m._id === p.messageId || m.receiverId === p.receiverId)
            ? { ...m, isDelivered: true }
            : m
        )
      );
    };
    const onRead = (p: { readBy?: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          (!p.readBy || m.receiverId === p.readBy)
            ? { ...m, isDelivered: true, isRead: true }
            : m
        )
      );
    };
    const onError = (p: { error: string }) => toast.error(p.error);
    const start = (p: { senderId: string }) => setTyping((s) => new Set(s).add(p.senderId));
    const stop = (p: { senderId: string }) => setTyping((s) => { const n = new Set(s); n.delete(p.senderId); return n; });

    socket.on("message:receive", onReceive);
    socket.on("message:sent", onSent);
    socket.on("message:delivered", onDelivered);
    socket.on("messages:delivered", onDelivered);
    socket.on("messages:read", onRead);
    socket.on("message:error", onError);
    socket.on("typing:start", start);
    socket.on("typing:stop", stop);

    return () => {
      socket.off("message:receive", onReceive);
      socket.off("message:sent", onSent);
      socket.off("message:delivered", onDelivered);
      socket.off("messages:delivered", onDelivered);
      socket.off("messages:read", onRead);
      socket.off("message:error", onError);
      socket.off("typing:start", start);
      socket.off("typing:stop", stop);
    };
  }, [socket, selectedId, qc, t]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    try {
      if (socket && isConnected) {
        const ack = await new Promise<{ success: boolean; error?: string }>((resolve) => {
          const timer = setTimeout(() => resolve({ success: false, error: t("app.chat.timeout") }), 8000);
          socket.emit("message:send", { receiverId: selected.id, message: text }, (r: { success: boolean; error?: string }) => { clearTimeout(timer); resolve(r); });
        });
        if (!ack.success) throw new Error(ack.error);
      } else {
        // Socket is down: fall back to the REST endpoint so the message is still delivered/stored.
        const res = await api.post("/messages/send", { receiverId: selected.id, message: text });
        setMessages((p) => [...p, res.data.message]);
      }
      setDraft("");
      socket?.emit("typing:stop", { receiverId: selected.id });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const onType = (v: string) => {
    setDraft(v);
    if (!socket || !selected) return;
    socket.emit("typing:start", { receiverId: selected.id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("typing:stop", { receiverId: selected.id }), 1500);
  };

  return (
    <DashboardLayout role={role}>
      <PageHeader title={t("app.chat.title")} subtitle={t("app.chat.subtitle")} actions={!isConnected ? <span className="flex items-center gap-1 text-xs text-amber-600"><WifiOff className="h-4 w-4" />{t("app.chat.offline")}</span> : undefined} />
      <audio ref={rtc.remoteAudioRef} autoPlay />
      {rtc.callState === "incoming" && (
        <div className="agro-card mb-3 flex-row items-center justify-between gap-3 p-3" role="alert">
          <p className="text-sm font-medium">{t("app.chat.incomingCall")}: {rtc.callInfo?.callerName || ""}</p>
          <div className="flex gap-2"><Button size="sm" onClick={() => void rtc.acceptCall()}>{t("app.chat.accept")}</Button><Button size="sm" variant="outline" onClick={rtc.rejectCall}>{t("app.chat.decline")}</Button></div>
        </div>
      )}
      <div className="agro-card h-[calc(100vh-14rem)] min-h-[420px] flex-row overflow-hidden">
        <aside className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border md:w-80`}>
          <div className="relative border-b border-border p-3">
            <Search className="absolute left-5 top-5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("app.chat.search")} className="pl-9" aria-label={t("app.chat.search")} />
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.isLoading ? <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : contacts.isError ? <div className="p-3"><ErrorState error={contacts.error} onRetry={() => void contacts.refetch()} /></div>
              : filtered.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">{t("app.chat.noContacts")}</p>
              : filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setSearchParams({ with: c.id }, { replace: true });
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${selectedId === c.id ? "bg-muted" : ""}`}
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${isOnline(c.id) ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c.name}</span><span className="block truncate text-xs text-muted-foreground">{t(ROLE_KEY[c.role] || "app.roles.farmer")}</span></span>
                  {unreadBy[c.id] > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unreadBy[c.id]}</span>}
                </button>
              ))}
          </div>
        </aside>

        <section className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground"><MessageCircle className="h-10 w-10" /><p className="text-sm">{t("app.chat.pick")}</p></div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border p-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => { setSelected(null); setSearchParams({}, { replace: true }); }} aria-label={t("app.common.back")}><ArrowLeft className="h-4 w-4" /></Button>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{selected.name}</p><p className="text-xs text-muted-foreground">{typing.has(selected.id) ? t("app.chat.typing") : isOnline(selected.id) ? t("app.chat.online") : t("app.chat.offlineUser")}</p></div>
                {isOnline(selected.id) && (rtc.callState === "idle"
                  ? <Button size="icon" variant="outline" onClick={() => void rtc.startCall(selected.id)} aria-label={t("app.chat.call")}><Phone className="h-4 w-4" /></Button>
                  : <div className="flex gap-2"><Button size="icon" variant="outline" onClick={rtc.toggleMute}>{rtc.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button><Button size="icon" variant="destructive" onClick={rtc.endCall}><PhoneOff className="h-4 w-4" /></Button></div>)}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {loadingMessages ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  : messages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t("app.chat.empty")}</p>
                  : messages.map((m) => {
                    const mine = senderOf(m) === user?.id;
                    return (
                      <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"}`}>
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-[10px] ${mine ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{formatDateTime(m.createdAt)}</span>
                            {mine && (
                              <span className="font-mono text-[11px] leading-none shrink-0" title={m.isRead ? "Read" : m.isDelivered ? "Delivered" : "Sent"}>
                                {m.isRead ? (
                                  <span className="text-sky-300 font-bold tracking-tighter">✓✓</span>
                                ) : m.isDelivered ? (
                                  <span className="text-primary-foreground/80 font-bold tracking-tighter">✓✓</span>
                                ) : (
                                  <span className="text-primary-foreground/60 font-medium">✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={endRef} />
              </div>
              <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
                <Input value={draft} onChange={(e) => onType(e.target.value)} maxLength={2000} placeholder={t("app.chat.placeholder")} aria-label={t("app.chat.placeholder")} />
                <Button type="submit" disabled={!draft.trim() || sending} aria-label={t("app.chat.send")}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </form>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ChatPage;
