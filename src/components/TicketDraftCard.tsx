"use client";

import type { TicketDraft } from "../types";
import { Check, Edit, X } from "lucide-react";

type Props = {
  draft: TicketDraft;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  loading?: boolean;
};

const PRIORITY_DOT: Record<string, string> = {
  Crítica: "bg-red-500",
  Alta: "bg-orange-500",
  Média: "bg-yellow-500",
  Baixa: "bg-gray-400",
};

export function TicketDraftCard({ draft, onConfirm, onEdit, onCancel, loading }: Props) {
  return (
    <div className="border border-orange-200 rounded-xl bg-orange-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-orange-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Novo chamado · Rascunho</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Aguardando confirmação
        </span>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">{draft.title}</h3>
        <p className="text-sm text-slate-600">{draft.description}</p>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Categoria</span>
            <p className="font-medium text-slate-700 mt-0.5">{draft.category}</p>
          </div>
          <div>
            <span className="text-slate-400">Prioridade</span>
            <p className="font-medium text-slate-700 mt-0.5 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[draft.priority] ?? "bg-gray-400"}`} />
              {draft.priority}
              <span className="text-slate-400">· resposta em {draft.priorityDeadline}</span>
            </p>
          </div>
          <div>
            <span className="text-slate-400">Afetados</span>
            <p className="font-medium text-slate-700 mt-0.5">{draft.affectedUsers} pessoa{draft.affectedUsers > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Check size={14} />
            Confirmar
          </button>
          <button
            onClick={onEdit}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Edit size={14} />
            Editar
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={14} />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
