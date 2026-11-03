"use client";

import type { AgentAction, AgentDecision } from "../types";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  actions: AgentAction[];
  decision?: AgentDecision | null;
};

export function ActionLabel({ actions, decision }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!actions.length) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-500">Nexo Assist</span>
        {actions.map((a, i) => (
          <span key={i} className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
            <span className="text-blue-400">✓</span>
            {a.label}
          </span>
        ))}
        {decision && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            Ver detalhes
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {expanded && decision && (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
          <div>
            <span className="font-medium text-slate-600">Entendeu:</span>
            <span className="text-slate-700 ml-1">{decision.understood}</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">Ação:</span>
            <span className="text-slate-700 ml-1">{decision.action}</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">Confiança:</span>
            <span className="text-slate-700 ml-1">{Math.round(decision.confidence * 100)}%</span>
            <div className="inline-block ml-2 w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden align-middle">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${decision.confidence * 100}%` }}
              />
            </div>
          </div>
          <div>
            <span className="font-medium text-slate-600">Raciocínio:</span>
            <span className="text-slate-700 ml-1">{decision.reasoning}</span>
          </div>
        </div>
      )}
    </div>
  );
}
