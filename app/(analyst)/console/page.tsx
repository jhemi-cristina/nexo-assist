"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Ticket, LogOut, Send, User,
  CheckCircle, Bot, ArrowLeft
} from "lucide-react";
import { ConversationItem } from "../../../src/components/ConversationItem";
import { TicketCard } from "../../../src/components/TicketCard";
import { Avatar } from "../../../src/components/Avatar";
import { ActionLabel } from "../../../src/components/ActionLabel";
import type { AgentAction, AgentDecision } from "../../../src/types";

type Message = {
  id: string;
  role: "USER" | "ASSISTANT" | "ANALYST" | "SYSTEM";
  content: string;
  createdAt: string;
  metadata?: { actions?: AgentAction[]; decision?: AgentDecision };
};

type TicketItem = {
  id: string;
  number: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  affectedUsers: number;
  createdAt: string;
  updatedAt: string;
  deadlineAt?: string;
  isOverdue?: boolean;
};

type Conversation = {
  id: string;
  status: string;
  mode: string;
  updatedAt: string;
  messageCount: number;
  analystId?: string;
  user: { id: string; name: string; email: string };
  messages?: Array<{ content: string; role: string }>;
};

type CurrentUser = { id: string; name: string; email: string; role: string };

const TABS = [
  { key: "all", label: "Todas" },
  { key: "waiting", label: "Para você" },
  { key: "active", label: "Com o agent" },
  { key: "mine", label: "Minhas" },
];

export default function ConsolePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("all");
  const [activePanel, setActivePanel] = useState<"conversations" | "profile">("conversations");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "ANALYST") { router.push("/login"); return; }
        setUser(d.user);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchConversations = useCallback(async () => {
    const filter = tab === "waiting" ? "WAITING_ANALYST"
      : tab === "active" ? "ACTIVE"
      : tab === "mine" ? "mine"
      : "all";
    const res = await fetch(`/api/analyst/conversations?filter=${filter}`);
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }, [tab]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchConversations, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, tab, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    const res = await fetch(`/api/analyst/conversations/${conv.id}`);
    const data = await res.json();
    setActiveConv(data.conversation);
    setMessages(data.conversation.messages ?? []);
    setTickets(data.tickets ?? []);
  }, []);

  const handleAssume = async () => {
    if (!activeConv) return;
    await fetch(`/api/analyst/conversations/${activeConv.id}/assume`, { method: "POST" });
    await loadConversation(activeConv);
    fetchConversations();
  };

  const handleReturn = async () => {
    if (!activeConv) return;
    await fetch(`/api/analyst/conversations/${activeConv.id}/return`, { method: "POST" });
    await loadConversation(activeConv);
    fetchConversations();
  };

  const handleClose = async () => {
    if (!activeConv) return;
    await fetch(`/api/analyst/conversations/${activeConv.id}/close`, { method: "POST" });
    await loadConversation(activeConv);
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      await fetch(`/api/analyst/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      setInput("");
      await loadConversation(activeConv);
    } finally {
      setSending(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    if (h > 0) return `${h}h`;
    const m = Math.floor(diff / 60000);
    return m > 0 ? `${m}m` : "agora";
  }

  const isMine = activeConv?.analystId === user?.id && activeConv?.status === "IN_PROGRESS";
  const canAssume = activeConv?.status === "WAITING_ANALYST";
  const canReturn = isMine;
  const canClose = activeConv?.status !== "CLOSED";

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "var(--font-geist-sans, Arial, sans-serif)" }}>
      {/* ICON BAR — 40px */}
      <nav className="w-10 flex flex-col items-center py-3 gap-4 shrink-0" style={{ backgroundColor: "#0f172a" }}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs mb-2"
          style={{ backgroundColor: "#2563eb" }}>
          N
        </div>

        <button
          onClick={() => setActivePanel("conversations")}
          title="Conversas"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activePanel === "conversations" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare size={16} />
        </button>

        <button
          onClick={() => setActivePanel("profile")}
          title="Meu perfil"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activePanel === "profile" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <User size={16} />
        </button>

        <div className="flex-1" />

        <button
          onClick={logout}
          title="Sair"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={16} />
        </button>
      </nav>

      {activePanel === "profile" ? (
        <ProfilePanel user={user} />
      ) : (
        <>
          {/* SIDEBAR — 260px */}
          <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 text-sm">Console do analista</h2>
              {user && <p className="text-xs text-slate-500 mt-0.5">{user.name}</p>}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-2 pt-1 gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                    tab === t.key
                      ? "text-blue-700 border-b-2 border-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center p-4">Nenhuma conversa</p>
              ) : (
                conversations.map((c) => (
                  <ConversationItem
                    key={c.id}
                    name={c.user.name}
                    preview={c.messages?.[0]?.content}
                    time={timeAgo(c.updatedAt)}
                    status={c.status}
                    selected={activeConv?.id === c.id}
                    onClick={() => loadConversation(c)}
                  />
                ))
              )}
            </div>
          </div>

          {/* MAIN CHAT */}
          <main className="flex-1 flex flex-col bg-white min-w-0">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                    <MessageSquare size={26} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Selecione uma conversa para começar</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <header className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar name={activeConv.user.name} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{activeConv.user.name}</p>
                      <p className="text-xs text-slate-500">{activeConv.user.email}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {canAssume && (
                      <button
                        onClick={handleAssume}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                        style={{ backgroundColor: "#2563eb" }}
                      >
                        Assumir atendimento
                      </button>
                    )}
                    {canReturn && (
                      <button
                        onClick={handleReturn}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Bot size={13} />
                        Devolver ao agente
                      </button>
                    )}
                    {canClose && (
                      <button
                        onClick={handleClose}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={13} />
                        Encerrar
                      </button>
                    )}
                  </div>
                </header>

                {/* Status badge */}
                {activeConv.status === "WAITING_ANALYST" && (
                  <div className="bg-orange-50 border-b border-orange-200 px-6 py-2 text-xs text-orange-700 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Aguardando analista — clique em "Assumir atendimento"
                  </div>
                )}
                {activeConv.status === "IN_PROGRESS" && (
                  <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 text-xs text-blue-700 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Em atendimento por {isMine ? "você" : "outro analista"}
                  </div>
                )}
                {activeConv.status === "CLOSED" && (
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 text-xs text-slate-500 font-medium flex items-center gap-2">
                    <CheckCircle size={12} />
                    Conversa encerrada
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-6">
                  <div className="max-w-2xl mx-auto space-y-5">
                    {messages.map((msg) => (
                      <AnalystMessage key={msg.id} msg={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input (only when IN_PROGRESS and it's mine) */}
                {isMine && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-white">
                    <div className="max-w-2xl mx-auto flex gap-2 items-end">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder={`Respondendo como ${user?.name}...`}
                        rows={2}
                        className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition"
                        style={{ backgroundColor: "#f8fafc" }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        className="px-4 py-3 rounded-xl text-white font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40"
                        style={{ backgroundColor: "#2563eb" }}
                      >
                        <Send size={15} />
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>

          {/* RIGHT PANEL — 260px */}
          {activeConv && (
            <aside className="w-64 border-l border-slate-200 bg-white flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <Ticket size={15} className="text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">Chamados do funcionário</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {tickets.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sem chamados registrados.</p>
                ) : (
                  tickets.map((t) => (
                    <TicketCard
                      key={t.id}
                      ticket={t}
                      compact
                    />
                  ))
                )}
              </div>
              {/* Employee info */}
              <div className="p-3 border-t border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Avatar name={activeConv.user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{activeConv.user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{activeConv.user.email}</p>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </>
      )}
    </div>
  );
}

function AnalystMessage({ msg }: { msg: Message }) {
  if (msg.role === "SYSTEM") {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  if (msg.role === "USER") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[70%] text-white px-4 py-2.5 rounded-[18px] rounded-br-[4px] text-sm"
          style={{ backgroundColor: "#1e293b" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === "ANALYST") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] space-y-1">
          <p className="text-xs text-slate-500 text-right">Analista</p>
          <div className="bg-blue-600 text-white px-4 py-2.5 rounded-[18px] rounded-br-[4px] text-sm">
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  // ASSISTANT
  const hasActions = msg.metadata?.actions && msg.metadata.actions.length > 0;

  return (
    <div className="flex justify-start gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
        <Bot size={14} className="text-blue-600" />
      </div>
      <div className="max-w-[80%] space-y-2">
        {hasActions && (
          <ActionLabel
            actions={msg.metadata!.actions!}
            decision={msg.metadata?.decision ?? null}
          />
        )}
        <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap shadow-sm">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user }: { user: CurrentUser | null }) {
  return (
    <main className="flex-1 flex flex-col bg-white">
      <header className="px-6 py-3 border-b border-slate-200">
        <div className="text-xs text-slate-400">
          Console do analista <span className="mx-1">›</span>
          <span className="text-slate-700">Meu perfil</span>
        </div>
      </header>
      <div className="flex-1 p-8">
        <div className="max-w-lg">
          <h2 className="text-xl font-semibold text-slate-900">Meu perfil</h2>
          <p className="text-sm text-slate-500 mt-1">Seu acesso ao console de analistas.</p>
          <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-slate-500 w-40">Nome</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{user?.name}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-slate-500">E-mail</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{user?.email}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-500">Perfil</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      Analista de TI
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
