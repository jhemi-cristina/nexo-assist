import { db } from "../../lib/db";
import { TicketCategory, TicketPriority, TicketStatus, TicketType } from "../../generated/prisma/client";

type SLAResult = { deadlineAt: Date; isOverdue: boolean };

function calcDeadline(createdAt: Date, priority: TicketPriority): SLAResult {
  const now = new Date();
  let deadlineAt: Date;

  switch (priority) {
    case TicketPriority.CRITICA: {
      deadlineAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
      break;
    }
    case TicketPriority.ALTA: {
      deadlineAt = addBusinessHours(createdAt, 4);
      break;
    }
    case TicketPriority.MEDIA: {
      deadlineAt = addBusinessDays(createdAt, 3);
      break;
    }
    case TicketPriority.BAIXA: {
      deadlineAt = addBusinessDays(createdAt, 5);
      break;
    }
  }

  return { deadlineAt, isOverdue: now > deadlineAt };
}

function addBusinessHours(from: Date, hours: number): Date {
  let remaining = hours * 60;
  let current = new Date(from);

  while (remaining > 0) {
    current = new Date(current.getTime() + 60 * 1000);
    const day = current.getDay();
    const hour = current.getHours();
    if (day >= 1 && day <= 5 && hour >= 8 && hour < 18) {
      remaining--;
    }
  }
  return current;
}

function addBusinessDays(from: Date, days: number): Date {
  let count = 0;
  let current = new Date(from);

  while (count < days) {
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    const day = current.getDay();
    if (day >= 1 && day <= 5) count++;
  }
  return current;
}

function mapCategory(cat: string): TicketCategory {
  const map: Record<string, TicketCategory> = {
    "Acesso": TicketCategory.ACESSO,
    "ACESSO": TicketCategory.ACESSO,
    "Rede e VPN": TicketCategory.REDE_VPN,
    "REDE_VPN": TicketCategory.REDE_VPN,
    "Hardware": TicketCategory.HARDWARE,
    "HARDWARE": TicketCategory.HARDWARE,
    "Software": TicketCategory.SOFTWARE,
    "SOFTWARE": TicketCategory.SOFTWARE,
    "E-mail": TicketCategory.EMAIL,
    "Email": TicketCategory.EMAIL,
    "EMAIL": TicketCategory.EMAIL,
    "Outros": TicketCategory.OUTROS,
    "OUTROS": TicketCategory.OUTROS,
  };
  return map[cat] ?? TicketCategory.OUTROS;
}

function mapPriority(p: string): TicketPriority {
  const map: Record<string, TicketPriority> = {
    "Crítica": TicketPriority.CRITICA,
    "CRITICA": TicketPriority.CRITICA,
    "Alta": TicketPriority.ALTA,
    "ALTA": TicketPriority.ALTA,
    "Média": TicketPriority.MEDIA,
    "MEDIA": TicketPriority.MEDIA,
    "Baixa": TicketPriority.BAIXA,
    "BAIXA": TicketPriority.BAIXA,
  };
  return map[p] ?? TicketPriority.MEDIA;
}

function priorityDeadlineLabel(priority: TicketPriority): string {
  switch (priority) {
    case TicketPriority.CRITICA: return "1 hora";
    case TicketPriority.ALTA: return "4 horas úteis";
    case TicketPriority.MEDIA: return "3 dias úteis";
    case TicketPriority.BAIXA: return "5 dias úteis";
  }
}

export async function listTickets(userId: string) {
  const tickets = await db.ticket.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return tickets.map((t) => {
    const { deadlineAt, isOverdue } = calcDeadline(t.createdAt, t.priority);
    return {
      ...t,
      deadlineAt,
      isOverdue: isOverdue && !["RESOLVED", "CLOSED", "APPROVED"].includes(t.status),
      priorityDeadlineLabel: priorityDeadlineLabel(t.priority),
    };
  });
}

export async function getTicket(ticketId: string, userId: string) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, ownerId: userId },
  });

  if (!ticket) return null;

  const { deadlineAt, isOverdue } = calcDeadline(ticket.createdAt, ticket.priority);
  return {
    ...ticket,
    deadlineAt,
    isOverdue: isOverdue && !["RESOLVED", "CLOSED", "APPROVED"].includes(ticket.status),
    priorityDeadlineLabel: priorityDeadlineLabel(ticket.priority),
  };
}

export async function searchTickets(userId: string, query: string) {
  const tickets = await db.ticket.findMany({
    where: {
      ownerId: userId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { number: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return tickets.map((t) => {
    const { deadlineAt, isOverdue } = calcDeadline(t.createdAt, t.priority);
    return {
      ...t,
      deadlineAt,
      isOverdue: isOverdue && !["RESOLVED", "CLOSED", "APPROVED"].includes(t.status),
      priorityDeadlineLabel: priorityDeadlineLabel(t.priority),
    };
  });
}

async function generateTicketNumber(type: TicketType): Promise<string> {
  const prefix = type === TicketType.INC ? "INC" : "REQ";
  const count = await db.ticket.count({ where: { type } });
  const num = String(count + 20500).padStart(5, "0");
  return `${prefix}-${num}`;
}

export async function createTicket(
  data: {
    title: string;
    description: string;
    type: string;
    category: string;
    priority: string;
    affectedUsers: number;
  },
  userId: string
) {
  const type = data.type === "INC" ? TicketType.INC : TicketType.REQ;
  const number = await generateTicketNumber(type);

  return db.ticket.create({
    data: {
      number,
      title: data.title,
      description: data.description,
      type,
      category: mapCategory(data.category),
      priority: mapPriority(data.priority),
      affectedUsers: data.affectedUsers,
      ownerId: userId,
    },
  });
}

export async function updateTicket(
  ticketId: string,
  userId: string,
  updates: { description?: string; status?: string; resolution?: string }
) {
  const ticket = await db.ticket.findFirst({ where: { id: ticketId, ownerId: userId } });
  if (!ticket) return null;

  const statusMap: Record<string, TicketStatus> = {
    OPEN: TicketStatus.OPEN,
    IN_PROGRESS: TicketStatus.IN_PROGRESS,
    WAITING_ANALYST: TicketStatus.WAITING_ANALYST,
    APPROVED: TicketStatus.APPROVED,
    RESOLVED: TicketStatus.RESOLVED,
    CLOSED: TicketStatus.CLOSED,
  };

  return db.ticket.update({
    where: { id: ticketId },
    data: {
      ...(updates.description ? { description: updates.description } : {}),
      ...(updates.status ? { status: statusMap[updates.status] ?? ticket.status } : {}),
      ...(updates.resolution ? { resolution: updates.resolution } : {}),
    },
  });
}

export async function checkDuplicate(userId: string, title: string, category: string) {
  const cat = mapCategory(category);
  return db.ticket.findFirst({
    where: {
      ownerId: userId,
      category: cat,
      status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_ANALYST] },
      title: { contains: title.split(" ").slice(0, 3).join(" "), mode: "insensitive" },
    },
  });
}

export { priorityDeadlineLabel };
