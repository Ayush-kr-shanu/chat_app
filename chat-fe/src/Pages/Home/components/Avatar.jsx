const GRADIENTS = [
  ["#8b5cf6", "#6d28d9"], // violet
  ["#06b6d4", "#0284c7"], // cyan-blue
  ["#f43f5e", "#be123c"], // rose
  ["#f59e0b", "#b45309"], // amber
  ["#10b981", "#047857"], // emerald
  ["#6366f1", "#3730a3"], // indigo
  ["#ec4899", "#9d174d"], // pink
  ["#14b8a6", "#0f766e"], // teal
];

const SIZE_CLASSES = {
  xs: "w-6  h-6  text-[9px]",
  sm: "w-8  h-8  text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-14 h-14 text-lg",
};

const DOT_CLASSES = {
  xs: "w-1.5 h-1.5 border",
  sm: "w-2   h-2   border",
  md: "w-2.5 h-2.5 border-2",
  lg: "w-3   h-3   border-2",
  xl: "w-3.5 h-3.5 border-2",
};

export default function Avatar({ name = "?", size = "md", online = false, className = "" }) {
  const idx    = name.charCodeAt(0) % GRADIENTS.length || 0;
  const [from, to] = GRADIENTS[idx];
  const initials   = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center font-bold text-white select-none`}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {initials}
      </div>

      {online && (
        <span
          className={`absolute bottom-0 right-0 ${DOT_CLASSES[size]} bg-emerald-400 rounded-full border-[#0a0a1a]`}
        />
      )}
    </div>
  );
}
