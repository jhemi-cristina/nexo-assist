"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AgentAction, AgentDecision } from "../types";

export type ConsoleMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "ANALYST" | "SYSTEM";
  content: string;
  createdAt: string;
  metadata?: { actions?: AgentAction[]; decision?: AgentDecision };
};

export type ConsoleTicket = {
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

export type ConsoleConversation = {
  id: string;
  status: string;
  mode: string;
  updatedAt: string;
  messageCount: number;
  analystId?: string;
  user: { id: string; name: string; email: string };
  messages?: Array<{ content: string; role: string }>;
};

export type ConsoleUser = { id: string; name: string; email: string; role: string };

const TABS = [
  { key: "all", label: "Todas" },
  { key: "waiting", label: "Para você" },
  { key: "active", label: "Com o agent" },
  { key: "mine", label: "Minhas" },
];

export { TABS };

export function useConsole() {
  const router = useRouter();
  const [user, setUser] = useState<ConsoleUser | null>(null);
  const [conversations, setConversations] = useState<ConsoleConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ConsoleConversation | null>(null);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [tickets, setTickets] = useState<ConsoleTicket[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("all");
  const [activePanel, setActivePanel] = useState<"conversations" | "profile">("conversations");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const normalized = (data.conversations ?? []).map((c: ConsoleConversation & { employee?: ConsoleConversation["user"] }) => ({
      ...c,
      user: c.user ?? c.employee,
    }));
    setConversations(normalized);
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

  const loadConversation = useCallback(async (conv: ConsoleConversation) => {
    setActiveConv(conv);
    const res = await fetch(`/api/analyst/conversations/${conv.id}`);
    const data = await res.json();
    const c = data.conversation;
    const normalized = { ...c, user: c.user ?? c.employee };
    setActiveConv(normalized);
    setMessages(normalized.messages ?? []);
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
    window.location.href = "/login";
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

  return {
    user,
    conversations,
    activeConv,
    messages,
    tickets,
    input,
    sending,
    tab,
    activePanel,
    sidebarOpen,
    isMine,
    canAssume,
    canReturn,
    canClose,
    messagesEndRef,
    setInput,
    setTab,
    setActivePanel,
    setSidebarOpen,
    loadConversation,
    fetchConversations,
    handleAssume,
    handleReturn,
    handleClose,
    sendMessage,
    logout,
    timeAgo,
  };
}
