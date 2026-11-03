"use client";

type Props = {
  replies: string[];
  onSelect: (reply: string) => void;
};

export function QuickReplies({ replies, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {replies.map((r) => (
        <button
          key={r}
          onClick={() => onSelect(r)}
          className="px-3 py-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-sm rounded-full transition-colors"
        >
          {r}
        </button>
      ))}
    </div>
  );
}
