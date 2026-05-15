import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { searchUsers } from "../../../api/chatApi";
import Avatar from "./Avatar";

export default function NewChatModal({ onClose, onStartChat }) {
  const [query,   setQuery  ] = useState("");
  const [users,   setUsers  ] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState("");
  const debounce              = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setUsers([]); return; }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await searchUsers(query.trim());
        setUsers(data);
      } catch {
        setError("Could not load users. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div
        className="w-full max-w-md mx-4 rounded-2xl overflow-hidden border"
        style={{
          background:   "linear-gradient(180deg, #111132 0%, #0c0c2e 100%)",
          borderColor:  "rgba(124,58,237,0.25)",
          boxShadow:    "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-white font-bold text-base">New Conversation</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all"
            style={{
              background:   "rgba(255,255,255,0.04)",
              borderColor:  "rgba(255,255,255,0.07)",
            }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.45)")}
            onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
          >
            <Search size={15} className="text-slate-600 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
            {loading && <Loader2 size={14} className="text-violet-400 animate-spin shrink-0" />}
          </div>
        </div>

        {/* Results */}
        <div className="px-2 pb-4 max-h-72 overflow-y-auto chat-scrollbar">
          {error && (
            <p className="text-center text-xs text-red-400 py-6 px-4">{error}</p>
          )}

          {!error && !loading && query.trim() && users.length === 0 && (
            <p className="text-center text-xs text-slate-600 py-8">No users found for "{query}"</p>
          )}

          {!error && !query.trim() && (
            <p className="text-center text-xs text-slate-700 py-8">
              Start typing to search registered users
            </p>
          )}

          {users.map(user => (
            <button
              key={user._id}
              onClick={() => onStartChat(user)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border border-transparent"
              onMouseEnter={e => {
                e.currentTarget.style.background    = "rgba(124,58,237,0.12)";
                e.currentTarget.style.borderColor   = "rgba(124,58,237,0.2)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background    = "";
                e.currentTarget.style.borderColor   = "transparent";
              }}
            >
              <Avatar name={user.name} size="md" online={user.status === "online"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                <p className="text-xs text-slate-600 truncate">{user.email}</p>
              </div>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={
                  user.status === "online"
                    ? { background: "rgba(52,211,153,0.12)", color: "#34d399" }
                    : { background: "rgba(255,255,255,0.05)", color: "#475569" }
                }
              >
                {user.status === "online" ? "Online" : "Offline"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
