"use client";

type Status = "OPEN" | "IN_PROGRESS" | "WAITING_ANALYST" | "APPROVED" | "RESOLVED" | "CLOSED" | "ACTIVE" | "OVERDUE";

const CONFIG: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
  OPEN: { label: "Aberto", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  IN_PROGRESS: { label: "Em andamento", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  WAITING_ANALYST: { label: "Aguardando analista", dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
  APPROVED: { label: "Aprovado", dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  RESOLVED: { label: "Resolvido", dot: "bg-gray-400", bg: "bg-gray-100", text: "text-gray-600" },
  CLOSED: { label: "Encerrado", dot: "bg-gray-400", bg: "bg-gray-100", text: "text-gray-600" },
  ACTIVE: { label: "Ativo", dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  OVERDUE: { label: "Prazo vencido", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
};

type Props = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className = "" }: Props) {
  const cfg = CONFIG[status as Status] ?? {
    label: status,
    dot: "bg-gray-400",
    bg: "bg-gray-100",
    text: "text-gray-600",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
