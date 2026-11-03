"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, MessageSquare, User, LogOut, Bot } from "lucide-react";
import { ActionLabel } from "../../../src/components/ActionLabel";
import { TicketCard } from "../../../src/components/TicketCard";
import { TicketDraftCard } from "../../../src/components/TicketDraftCard";
import { QuickReplies } from "../../../src/components/QuickReplies";
import { Avatar } from "../../../src/components/Avatar";
import type { StreamEvent, AgentAction, AgentDecision, TicketDraft } from "../../../src/types";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: AgentAction[];
  decision?: AgentDecision | null;
  draft?: TicketDraft | null;
  quickReplies?: string[];
};

type Conversation = {
  id: string;
  status: string;
  messageCount: number;
  updatedAt: string;
  messages?: Array<{ content: string; role: string }>;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "profile">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.push("/login"); return; }
        setUser(d.user);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []));
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    const res = await fetch(`/api/conversations/${conv.id}`);
    const data = await res.json();
    const loaded = data.conversation;
    setActiveConv(loaded);

    const msgs: Message[] = (loaded.messages ?? []).map((m: { id: string; role: string; content: string; metadata?: { actions?: AgentAction[]; decision?: AgentDecision; draft?: TicketDraft } }) => ({
      id: m.id,
      role: m.role === "USER" ? "user" : m.role === "SYSTEM" ? "system" : "assistant",
      content: m.content,
      actions: m.metadata?.actions,
      decision: m.metadata?.decision,
      draft: m.metadata?.draft,
    }));
    setMessages(msgs);
  }, []);

  const startNewConversation = async () => {
    const res = await fetch("/api/conversations", { method: "POST" });
    const data = await res.json();
    const newConv = data.conversation;
    setConversations((prev) => [newConv, ...prev]);
    setActiveConv(newConv);
    setMessages([]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeConv || sending) return;

    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    const agentMsg: Message = {
      id: `agent-${Date.now()}`,
      role: "assistant",
      content: "",
      actions: [],
      decision: null,
      draft: null,
      quickReplies: [],
    };

    setMessages((prev) => [...prev, agentMsg]);

    try {
      const response = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsg.id
              ? { ...m, content: err.error ?? "Erro ao processar sua mensagem." }
              : m
          )
        );
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const raw = line.replace("data: ", "");
          try {
            const event = JSON.parse(raw) as StreamEvent;

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== agentMsg.id) return m;
                switch (event.type) {
                  case "text_delta":
                    return { ...m, content: m.content + event.delta };
                  case "actions":
                    return { ...m, actions: event.actions };
                  case "decision":
                    return { ...m, decision: event.decision };
                  case "ticket_draft":
                    return { ...m, draft: event.draft };
                  case "quick_replies":
                    return { ...m, quickReplies: event.replies };
                  default:
                    return m;
                }
              })
            );

            if (event.type === "done") {
              setActiveConv((prev) =>
                prev ? { ...prev, messageCount: prev.messageCount + 2 } : prev
              );
              fetch("/api/conversations").then((r) => r.json()).then((d) => setConversations(d.conversations ?? []));
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsg.id ? { ...m, content: "Erro de conexão. Tente novamente." } : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isWaiting = activeConv?.status === "WAITING_ANALYST" || activeConv?.status === "IN_PROGRESS";
  const msgCount = activeConv?.messageCount ?? 0;

  function convPreview(conv: Conversation) {
    const last = conv.messages?.[0];
    if (!last) return "Nova conversa";
    return last.content.slice(0, 50);
  }

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    if (h > 0) return `${h}h`;
    return "agora";
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "var(--font-geist-sans, Arial, sans-serif)" }}>
      {/* SIDEBAR */}
      <aside className="w-44 border-r border-slate-200 bg-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#2563eb" }}>
            N
          </div>
          <span className="font-semibold text-slate-800 text-sm">Nexo Assist</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MessageSquare size={16} />
            Atendimento
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User size={16} />
            Meu perfil
          </button>
        </nav>

        {/* User footer */}
        {user && (
          <div className="p-3 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
        )}
      </aside>

      {activeTab === "profile" ? (
        <ProfileTab user={user} />
      ) : (
        <>
          {/* CONVERSATIONS LIST */}
          <div className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#2563eb" }}
              >
                <Plus size={15} />
                Nova conversa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center p-4">Nenhuma conversa ainda</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadConversation(c)}
                    className={`w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      activeConv?.id === c.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {convPreview(c)}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(c.updatedAt)}</span>
                    </div>
                    {(c.status === "WAITING_ANALYST" || c.status === "IN_PROGRESS") && (
                      <span className="text-xs text-orange-600">● Aguardando analista</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* MAIN CHAT */}
          <main className="flex-1 flex flex-col bg-white min-w-0">
            {/* Header */}
            <header className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="text-xs text-slate-400">
                Service desk de TI <span className="mx-1">›</span>
                <span className="text-slate-700">Atendimento</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {isWaiting ? "Aguardando analista" : "Assistente online"}
              </div>
            </header>

            {/* Waiting banner */}
            {isWaiting && (
              <div className="bg-orange-50 border-b border-orange-200 px-6 py-2.5 flex items-center gap-3">
                <span className="text-orange-700 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Conversa com analista — Nexo Assist pausado
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {!activeConv ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: "#eff6ff" }}>
                      <Bot size={28} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Como posso ajudar?</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Inicie uma conversa ou selecione uma existente.
                      </p>
                    </div>
                    <button
                      onClick={startNewConversation}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: "#2563eb" }}
                    >
                      Iniciar conversa
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <p className="text-slate-500 text-sm">
                      Olá{user ? `, ${user.name.split(" ")[0]}` : ""}! Como posso ajudar?
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageItem
                      key={msg.id}
                      msg={msg}
                      onQuickReply={(r) => sendMessage(r)}
                      onDraftConfirm={() => sendMessage("Sim, confirmar a abertura do chamado.")}
                      onDraftEdit={() => sendMessage("Quero editar as informações do chamado.")}
                      onDraftCancel={() => sendMessage("Cancelar a abertura do chamado.")}
                    />
                  ))
                )}

                {/* Typing indicator */}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot size={14} className="text-blue-600" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
                        <div className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            {activeConv && !isWaiting && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-white">
                <div className="max-w-2xl mx-auto">
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escreva para o Nexo..."
                      disabled={sending || msgCount >= 30}
                      rows={1}
                      className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                      style={{ backgroundColor: "#f8fafc" }}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || sending || msgCount >= 30}
                      className="px-4 py-3 rounded-xl text-white font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      style={{ backgroundColor: "#2563eb" }}
                    >
                      <Send size={15} />
                      Enviar
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 text-right">
                    {msgCount}/30 mensagens nesta sessão
                    {msgCount >= 30 && (
                      <span className="text-orange-600 ml-1">
                        · Limite atingido. Inicie uma nova conversa.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {activeConv && isWaiting && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-orange-50">
                <div className="max-w-2xl mx-auto text-center py-2">
                  <p className="text-sm text-orange-700">
                    Aguardando um analista. O Nexo Assist está pausado.
                  </p>
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

function MessageItem({
  msg,
  onQuickReply,
  onDraftConfirm,
  onDraftEdit,
  onDraftCancel,
}: {
  msg: Message;
  onQuickReply: (r: string) => void;
  onDraftConfirm: () => void;
  onDraftEdit: () => void;
  onDraftCancel: () => void;
}) {
  if (msg.role === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  if (msg.role === "user") {
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

  // Agent message
  const metadata = msg.actions || msg.decision ? {
    actions: msg.actions ?? [],
    decision: msg.decision ?? null,
  } : null;

  return (
    <div className="flex justify-start gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
        <Bot size={14} className="text-blue-600" />
      </div>
      <div className="max-w-[80%] space-y-2">
        {metadata && metadata.actions.length > 0 && (
          <ActionLabel actions={metadata.actions} decision={metadata.decision} />
        )}

        <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm p-4 shadow-sm text-sm text-slate-800 whitespace-pre-wrap">
          {msg.content || <span className="text-slate-400">Processando...</span>}
        </div>

        {msg.draft && (
          <TicketDraftCard
            draft={msg.draft}
            onConfirm={onDraftConfirm}
            onEdit={onDraftEdit}
            onCancel={onDraftCancel}
          />
        )}

        {msg.quickReplies && msg.quickReplies.length > 0 && (
          <QuickReplies replies={msg.quickReplies} onSelect={onQuickReply} />
        )}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: CurrentUser | null }) {
  return (
    <main className="flex-1 flex flex-col bg-white">
      <header className="px-6 py-3 border-b border-slate-200">
        <div className="text-xs text-slate-400">
          Service desk de TI <span className="mx-1">›</span>
          <span className="text-slate-700">Meu perfil</span>
        </div>
      </header>
      <div className="flex-1 p-8">
        <div className="max-w-lg">
          <h2 className="text-xl font-semibold text-slate-900">Meu perfil</h2>
          <p className="text-sm text-slate-500 mt-1">Seus dados de acesso ao service desk de TI.</p>

          <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-slate-500 w-40">Nome</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{user?.name}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-500">E-mail corporativo</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <span className="font-medium text-slate-800">{user?.email}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🔒 Gerenciado pela TI
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🔑</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Senha</p>
                <p className="text-xs text-slate-500">Enviaremos um link de redefinição para seu e-mail.</p>
              </div>
            </div>
            <button className="text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              Redefinir senha
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
