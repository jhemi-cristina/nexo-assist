"use client";

const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-amber-500",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

type Props = {
  name: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
};

export function Avatar({ name, size = "md", online }: Props) {
  const color = colorForName(name);
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-10 h-10 text-base" : "w-8 h-8 text-sm";

  return (
    <div className="relative inline-flex shrink-0">
      <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-semibold`}>
        {initials(name)}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-400"}`}
        />
      )}
    </div>
  );
}
