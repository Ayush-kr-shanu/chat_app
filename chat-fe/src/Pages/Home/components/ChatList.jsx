import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import Avatar from "./Avatar";

const FILTERS = ["All", "Unread", "Groups"];

export default function ChatList({
  chats,
  loading = false,
  selectedChatId,
  onSelectChat,
  onNewChat,
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = chats.filter((chat) => {
    const matchesSearch =
      chat.name.toLowerCase().includes(search.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(search.toLowerCase());
    if (activeFilter === "Unread") return matchesSearch && chat.unread > 0;
    if (activeFilter === "Groups") return matchesSearch && chat.isGroup;
    return matchesSearch;
  });

  const totalUnread = chats.reduce((acc, c) => acc + (c.unread || 0), 0);

  return (
    <div
      className="w-75 shrink-0 flex flex-col border-r border-white/5"
      style={{
        background: "linear-gradient(180deg, #09092a 0%, #0c0c2e 100%)",
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-white text-lg font-bold tracking-tight">
              Messages
            </h2>
            {totalUnread > 0 && (
              <span
                className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                }}
              >
                {totalUnread}
              </span>
            )}
          </div>
          <button
            title="New chat"
            onClick={onNewChat}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full py-2.5 pl-9 pr-4 rounded-xl text-sm text-slate-300 placeholder-slate-600 outline-none transition-all border"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")
            }
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                activeFilter === f
                  ? { background: "rgba(124,58,237,0.18)", color: "#c4b5fd" }
                  : { color: "#475569" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat items ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 chat-scrollbar">
        {loading ? (
          /* Skeleton shimmer while fetching */
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse"
            >
              <div
                className="w-10 h-10 rounded-full shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-3 rounded-full w-2/3"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <div
                  className="h-2 rounded-full w-4/5"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              </div>
            </div>
          ))
        ) : filtered.length === 0 && !search.trim() ? (
          /* No conversations at all */
          <div className="flex flex-col items-center justify-center pt-16 gap-3 text-slate-700 px-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.12)" }}
            >
              <Plus size={22} className="text-violet-500" />
            </div>
            <p className="text-xs text-center text-slate-600">
              No conversations yet.
              <br />
              <button
                onClick={onNewChat}
                className="text-violet-400 hover:underline mt-0.5"
              >
                Start a new chat
              </button>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 gap-2 text-slate-700">
            <Search size={28} className="opacity-40" />
            <p className="text-xs">No conversations found</p>
          </div>
        ) : (
          filtered.map((chat) => {
            const isSelected = chat.id === selectedChatId;
            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 border"
                style={{
                  background: isSelected
                    ? "rgba(124,58,237,0.14)"
                    : "transparent",
                  borderColor: isSelected
                    ? "rgba(124,58,237,0.25)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <Avatar
                  name={chat.name}
                  size="md"
                  online={chat.status === "online"}
                />

                <div className="flex-1 min-w-0">
                  {/* Name + time row */}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: isSelected ? "#fff" : "#cbd5e1" }}
                    >
                      {chat.name}
                    </span>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {chat.lastTime}
                    </span>
                  </div>

                  {/* Preview + badge row */}
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span
                      className="text-xs truncate"
                      style={{ color: chat.unread > 0 ? "#94a3b8" : "#475569" }}
                    >
                      {chat.typing ? (
                        <span className="text-violet-400 italic">typing…</span>
                      ) : (
                        chat.lastMessage
                      )}
                    </span>
                    {chat.unread > 0 && (
                      <span
                        className="shrink-0 min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #7c3aed, #06b6d4)",
                        }}
                      >
                        {chat.unread > 9 ? "9+" : chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
