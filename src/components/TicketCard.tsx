"use client";

import { StatusBadge } from "./StatusBadge";
import { Clock, AlertTriangle } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICA: "border-l-red-500",
  ALTA: "border-l-orange-500",
  MEDIA: "border-l-yellow-500",
  BAIXA: "border-l-gray-300",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICA: "bg-red-500",
  ALTA: "bg-orange-500",
  MEDIA: "bg-yellow-500",
  BAIXA: "bg-gray-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  ACESSO: "Acesso",
  REDE_VPN: "Rede e VPN",
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  EMAIL: "E-mail",
  OUTROS: "Outros",
};

type Ticket = {
  id: string;
  number: string;
  title: string;
  description: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  affectedUsers: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  isOverdue?: boolean;
  deadlineAt?: string | Date;
  priorityDeadlineLabel?: string;
};

type Props = {
  ticket: Ticket;
  compact?: boolean;
};

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);

  if (days > 0) return `há ${days} dia${days > 1 ? "s" : ""}`;
  if (hours > 0) return `há ${hours}h`;
  return "agora";
}

export function TicketCard({ ticket, compact = false }: Props) {
  const borderColor = PRIORITY_COLORS[ticket.priority] ?? "border-l-gray-300";

  if (compact) {
    return (
      <div className={`border border-slate-200 border-l-4 ${borderColor} rounded-lg p-3 bg-white`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 font-mono">{ticket.number}</span>
          <StatusBadge status={ticket.status} />
        </div>
        <p className="text-sm font-medium text-slate-800 mt-1 line-clamp-1">{ticket.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{timeAgo(ticket.updatedAt)}</p>
      </div>
    );
  }

  return (
    <div className={`border border-slate-200 border-l-4 ${borderColor} rounded-xl p-4 bg-white shadow-sm`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-xs text-slate-500 font-mono">Chamado · {ticket.number}</span>
          <h3 className="font-semibold text-slate-800 mt-0.5">{ticket.title}</h3>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ticket.description}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400">Categoria</span>
          <p className="font-medium text-slate-700 mt-0.5">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</p>
        </div>
        <div>
          <span className="text-slate-400">Prioridade</span>
          <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority] ?? "bg-gray-400"}`} />
            {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
            {ticket.priorityDeadlineLabel && (
              <span className="text-slate-400">· {ticket.priorityDeadlineLabel}</span>
            )}
          </p>
        </div>
        <div>
          <span className="text-slate-400">Aberto em</span>
          <p className="font-medium text-slate-700 mt-0.5">{new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
        <div>
          <span className="text-slate-400">Última atualização</span>
          <p className="font-medium mt-0.5 flex items-center gap-1">
            <span className={ticket.isOverdue ? "text-red-600" : "text-slate-700"}>
              {timeAgo(ticket.updatedAt)}
            </span>
            {ticket.isOverdue && (
              <span className="flex items-center gap-0.5 text-red-600">
                <AlertTriangle size={11} />
                prazo vencido
              </span>
            )}
          </p>
        </div>
      </div>

      {ticket.isOverdue && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <Clock size={12} />
          <span>Este chamado está com o prazo vencido. Deseja chamar um analista?</span>
        </div>
      )}
    </div>
  );
}
