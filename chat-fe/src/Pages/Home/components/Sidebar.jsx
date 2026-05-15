import { MessageSquare, Phone, Users, Star, Archive, Settings } from "lucide-react";
import Avatar from "./Avatar";

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Messages", id: "messages" },
  { icon: Phone,         label: "Calls",    id: "calls"    },
  { icon: Users,         label: "Contacts", id: "contacts" },
  { icon: Star,          label: "Starred",  id: "starred"  },
  { icon: Archive,       label: "Archived", id: "archived" },
];

export default function Sidebar({ currentUser, activeNav = "messages" }) {
  return (
    <aside
      className="w-17 shrink-0 flex flex-col items-center py-4 border-r border-white/5 z-10"
      style={{ background: "linear-gradient(180deg, #06061a 0%, #09092a 100%)" }}
    >
      {/* ── Logo ───────────────────────────────────────────── */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-6 shrink-0"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
          boxShadow: "0 4px 20px rgba(124, 58, 237, 0.45)",
        }}
      >
        <MessageSquare size={18} className="text-white" />
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
          const isActive = id === activeNav;
          return (
            <button
              key={id}
              title={label}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "text-violet-400"
                  : "text-slate-600 hover:text-slate-400"
              }`}
              style={isActive ? { background: "rgba(124, 58, 237, 0.18)" } : undefined}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = "";
              }}
            >
              {/* Active left-bar accent */}
              {isActive && (
                <span
                  className="absolute -left-px top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: "linear-gradient(180deg, #7c3aed, #06b6d4)" }}
                />
              )}
              <Icon size={19} />
            </button>
          );
        })}
      </nav>

      {/* ── Bottom ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <button
          title="Settings"
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-400 transition-all"
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "")}
        >
          <Settings size={19} />
        </button>

        <div title={currentUser.name} className="cursor-pointer">
          <Avatar name={currentUser.name} size="sm" online />
        </div>
      </div>
    </aside>
  );
}
