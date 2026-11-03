export type AgentAction = {
  label: string;
  detail: string;
  tool: string;
};

export type AgentDecision = {
  understood: string;
  action: string;
  confidence: number;
  reasoning: string;
};

export type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "actions"; actions: AgentAction[] }
  | { type: "decision"; decision: AgentDecision }
  | { type: "ticket_draft"; draft: TicketDraft }
  | { type: "quick_replies"; replies: string[] }
  | { type: "error"; message: string }
  | { type: "done" };

export type TicketDraft = {
  title: string;
  description: string;
  type: "INC" | "REQ";
  category: string;
  priority: string;
  affectedUsers: number;
  priorityDeadline: string;
};

export type SessionPayload = {
  userId: string;
  role: "EMPLOYEE" | "ANALYST";
};
