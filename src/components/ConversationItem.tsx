"use client";

import { Avatar } from "./Avatar";

type Props = {
  name: string;
  preview?: string;
  time?: string;
  status: string;
  badgeCount?: number;
  selected?: boolean;
  onClick: () => void;
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  WAITING_ANALYST: { label: "Transferida", color: "text-orange-600 bg-orange-50" },
  IN_PROGRESS: { label: "Em atendimento", color: "text-blue-600 bg-blue-50" },
  ACTIVE: { label: "Agent atendendo", color: "text-blue-500 bg-blue-50" },
  CLOSED: { label: "Encerrada", color: "text-gray-500 bg-gray-50" },
};

export function ConversationItem({ name, preview, time, status, badgeCount, selected, onClick }: Props) {
  const badge = STATUS_BADGE[status];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors ${selected ? "bg-blue-50" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-800 truncate">{name}</span>
            {time && <span className="text-xs text-slate-400 shrink-0">{time}</span>}
          </div>
          {preview && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{preview}</p>
          )}
          {badge && (
            <span className={`inline-block text-xs font-medium mt-1 px-1.5 py-0.5 rounded ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="shrink-0 min-w-[18px] h-[18px] bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {badgeCount}
          </span>
        )}
      </div>
    </button>
  );
}
