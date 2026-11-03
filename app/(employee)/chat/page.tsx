"use client";

import { Send, Plus, MessageSquare, User, LogOut, Bot, Menu, X } from "lucide-react";
import { ActionLabel } from "../../../src/components/ActionLabel";
import { TicketDraftCard } from "../../../src/components/TicketDraftCard";
import { QuickReplies } from "../../../src/components/QuickReplies";
import { Avatar } from "../../../src/components/Avatar";
import { useChat } from "../../../src/hooks/useChat";
import type { ChatMessage, ChatUser } from "../../../src/hooks/useChat";

export default function ChatPage() {
  const {
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
  } = useChat();

  return (
    <div className="h-screen flex overflow-hidden" style={{ fontFamily: "var(--font-geist-sans, Arial, sans-serif)" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`border-r border-slate-200 bg-white flex flex-col shrink-0 ${sidebarOpen ? "fixed inset-y-0 left-0 z-50 w-64" : "hidden md:flex md:relative md:w-44"}`}>
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: "#2563eb" }}>
            N
          </div>
          <span className="font-semibold text-slate-800 text-sm flex-1">Nexo Assist</span>
          <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="p-2 space-y-1 border-b border-slate-200 md:border-b-0">
          <button
            onClick={() => { setActiveTab("chat"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "chat" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MessageSquare size={16} />
            Atendimento
          </button>
          <button
            onClick={() => { setActiveTab("profile"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "profile" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User size={16} />
            Meu perfil
          </button>
        </nav>

        <div className="md:hidden flex-1 overflow-y-auto">
          <div className="p-3 border-b border-slate-200">
            <button
              onClick={() => { startNewConversation(); setSidebarOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "#2563eb" }}
            >
              <Plus size={15} />
              Nova conversa
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center p-4">Nenhuma conversa ainda</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => { loadConversation(c); setSidebarOpen(false); }}
                className={`w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${activeConv?.id === c.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-slate-700 truncate">{convPreview(c)}</span>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(c.updatedAt)}</span>
                </div>
                {(c.status === "WAITING_ANALYST" || c.status === "IN_PROGRESS") && (
                  <span className="text-xs text-orange-600">● Aguardando analista</span>
                )}
              </button>
            ))
          )}
        </div>

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
        <ProfileTab user={user} onOpenSidebar={() => setSidebarOpen(true)} />
      ) : (
        <>
          <div className="hidden md:flex w-56 border-r border-slate-200 bg-white flex-col shrink-0">
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

          <main className="flex-1 flex flex-col bg-white min-w-0">
            <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(true)}>
                  <Menu size={20} />
                </button>
                <div className="text-xs text-slate-400">
                  Service desk de TI <span className="mx-1">›</span>
                  <span className="text-slate-700">Atendimento</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {isWaiting ? "Aguardando analista" : "Assistente online"}
              </div>
            </header>

            {isWaiting && (
              <div className="bg-orange-50 border-b border-orange-200 px-6 py-2.5 flex items-center gap-3">
                <span className="text-orange-700 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Conversa com analista — Nexo Assist pausado
                </span>
              </div>
            )}

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
              <div className="px-4 pb-4 pt-2 border-t border-orange-200 bg-orange-50">
                <div className="max-w-2xl mx-auto">
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={analystInput}
                      onChange={(e) => setAnalystInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnalystReply(); } }}
                      placeholder="Responder ao analista..."
                      disabled={sendingAnalyst}
                      rows={1}
                      className="flex-1 resize-none px-4 py-3 rounded-xl border border-orange-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                      style={{ backgroundColor: "#fff7ed" }}
                    />
                    <button
                      onClick={sendAnalystReply}
                      disabled={!analystInput.trim() || sendingAnalyst}
                      className="px-4 py-3 rounded-xl text-white font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      style={{ backgroundColor: "#ea580c" }}
                    >
                      <Send size={15} />
                      Enviar
                    </button>
                  </div>
                  <p className="text-xs text-orange-600 mt-1.5">
                    Conversa com analista — Nexo Assist pausado
                  </p>
                </div>
              </div>
            )}
          </main>

          {!isWaiting && (
            <button
              onClick={startNewConversation}
              className="md:hidden fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center"
              style={{ backgroundColor: "#2563eb" }}
              title="Nova conversa"
            >
              <Plus size={22} />
            </button>
          )}
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
  msg: ChatMessage;
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

  if (msg.role === "analyst") {
    return (
      <div className="flex justify-start gap-2">
        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-1">
          <span className="text-orange-600 text-xs font-bold">A</span>
        </div>
        <div className="max-w-[80%]">
          <p className="text-xs text-orange-600 font-medium mb-1">Analista</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800 whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

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

function ProfileTab({ user, onOpenSidebar }: { user: ChatUser | null; onOpenSidebar: () => void }) {
  return (
    <main className="flex-1 flex flex-col bg-white min-w-0">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
        <button className="md:hidden text-slate-500 hover:text-slate-700" onClick={onOpenSidebar}>
          <Menu size={20} />
        </button>
        <div className="text-xs text-slate-400">
          Service desk de TI <span className="mx-1">›</span>
          <span className="text-slate-700">Meu perfil</span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-semibold text-slate-900">Meu perfil</h2>
          <p className="text-sm text-slate-500 mt-1">Seus dados de acesso ao service desk de TI.</p>

          <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500 mb-0.5">Nome</p>
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 mb-0.5">E-mail corporativo</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800 break-all">{user?.email}</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                  🔒 Gerenciado pela TI
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-lg">🔑</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">Senha</p>
                <p className="text-xs text-slate-500">Enviaremos um link de redefinição para seu e-mail.</p>
              </div>
            </div>
            <button className="text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              Redefinir senha
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
