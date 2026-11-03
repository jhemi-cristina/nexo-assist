"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { StreamEvent, AgentAction, AgentDecision, TicketDraft } from "../types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "analyst";
  content: string;
  actions?: AgentAction[];
  decision?: AgentDecision | null;
  draft?: TicketDraft | null;
  quickReplies?: string[];
};

export type ChatConversation = {
  id: string;
  status: string;
  messageCount: number;
  updatedAt: string;
  messages?: Array<{ content: string; role: string }>;
};

export type ChatUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type RawMessage = {
  id: string;
  role: string;
  content: string;
  metadata?: { actions?: AgentAction[]; decision?: AgentDecision; draft?: TicketDraft };
};

function mapRole(role: string): ChatMessage["role"] {
  if (role === "USER") return "user";
  if (role === "SYSTEM") return "system";
  if (role === "ANALYST") return "analyst";
  return "assistant";
}

function mapMessages(raw: RawMessage[]): ChatMessage[] {
  return raw.map((m) => ({
    id: m.id,
    role: mapRole(m.role),
    content: m.content,
    actions: m.metadata?.actions,
    decision: m.metadata?.decision,
    draft: m.metadata?.draft,
  }));
}

export function useChat() {
  const router = useRouter();
  const [user, setUser] = useState<ChatUser | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "profile">("chat");
  const [analystInput, setAnalystInput] = useState("");
  const [sendingAnalyst, setSendingAnalyst] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const refreshConvMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}`);
    const data = await res.json();
    const conv = data.conversation;
    if (!conv) return;
    setActiveConv((prev) => prev ? { ...prev, status: conv.status } : prev);
    setMessages(mapMessages(conv.messages ?? []));
  }, []);

  useEffect(() => {
    const isWaitingNow = activeConv?.status === "WAITING_ANALYST" || activeConv?.status === "IN_PROGRESS";
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (activeConv && isWaitingNow) {
      pollRef.current = setInterval(() => refreshConvMessages(activeConv.id), 4000);
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeConv?.id, activeConv?.status, refreshConvMessages]);

  const loadConversation = useCallback(async (conv: ChatConversation) => {
    setActiveConv(conv);
    const res = await fetch(`/api/conversations/${conv.id}`);
    const data = await res.json();
    const loaded = data.conversation;
    setActiveConv(loaded);
    setMessages(mapMessages(loaded.messages ?? []));
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

    const userMsg: ChatMessage = { id: `tmp-${Date.now()}`, role: "user", content: text };
    const agentMsg: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: "assistant",
      content: "",
      actions: [],
      decision: null,
      draft: null,
      quickReplies: [],
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setInput("");
    setSending(true);

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
            m.id === agentMsg.id ? { ...m, content: err.error ?? "Erro ao processar sua mensagem." } : m
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
          try {
            const event = JSON.parse(line.replace("data: ", "")) as StreamEvent;

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== agentMsg.id) return m;
                switch (event.type) {
                  case "text_delta": return { ...m, content: m.content + event.delta };
                  case "actions": return { ...m, actions: event.actions };
                  case "decision": return { ...m, decision: event.decision };
                  case "ticket_draft": return { ...m, draft: event.draft };
                  case "quick_replies": return { ...m, quickReplies: event.replies };
                  case "error": return { ...m, content: event.message ?? "Erro ao processar sua mensagem." };
                  default: return m;
                }
              })
            );

            if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === agentMsg.id && !m.content
                    ? { ...m, content: "Não foi possível processar sua mensagem. Verifique a configuração do servidor." }
                    : m
                )
              );
              setActiveConv((prev) => prev ? { ...prev, messageCount: prev.messageCount + 2 } : prev);
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

  const sendAnalystReply = async () => {
    if (!analystInput.trim() || !activeConv || sendingAnalyst) return;
    const text = analystInput.trim();
    setAnalystInput("");
    setSendingAnalyst(true);
    try {
      await fetch(`/api/conversations/${activeConv.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      await refreshConvMessages(activeConv.id);
    } finally {
      setSendingAnalyst(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const isWaiting = activeConv?.status === "WAITING_ANALYST" || activeConv?.status === "IN_PROGRESS";
  const msgCount = activeConv?.messageCount ?? 0;

  function convPreview(conv: ChatConversation) {
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

  return {
    user,
    conversations,
    activeConv,
    messages,
    input,
    sending,
    activeTab,
    analystInput,
    sendingAnalyst,
    sidebarOpen,
    isWaiting,
    msgCount,
    messagesEndRef,
    textareaRef,
    setInput,
    setActiveTab,
    setAnalystInput,
    setSidebarOpen,
    loadConversation,
    startNewConversation,
    sendMessage,
    handleKeyDown,
    sendAnalystReply,
    logout,
    convPreview,
    timeAgo,
  };
}
