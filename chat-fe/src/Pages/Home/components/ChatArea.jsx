import { useState, useRef, useEffect, useCallback } from "react";
import {
  Phone, Video, MoreVertical,
  Paperclip, Smile, Mic, Send,
  Check, CheckCheck, Image, MessageSquare,
} from "lucide-react";
import Avatar from "./Avatar";
import socket from "../../../api/socket";

function MsgStatus({ status }) {
  if (status === "sent")      return <Check      size={11} className="text-slate-600" />;
  if (status === "delivered") return <CheckCheck size={11} className="text-slate-500" />;
  if (status === "read")      return <CheckCheck size={11} className="text-violet-400" />;
  return null;
}

function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
      <span
        className="text-[11px] font-medium px-3 py-1 rounded-full border"
        style={{
          color: "#64748b",
          background: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function Bubble({ msg, isMe }) {
  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex flex-col gap-1 max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap ${
            isMe ? "rounded-2xl rounded-br-sm text-white" : "rounded-2xl rounded-bl-sm text-slate-100 border border-white/5"
          }`}
          style={
            isMe
              ? { background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }
              : { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }
          }
        >
          {msg.text}
        </div>

        {/* Timestamp + status */}
        <div className={`flex items-center gap-1 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-slate-600">{msg.time}</span>
          {isMe && <MsgStatus status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-5"
      style={{
        background:
          "radial-gradient(ellipse at 60% 40%, rgba(124,58,237,0.07) 0%, transparent 60%), " +
          "linear-gradient(135deg, #0a0a1a 0%, #0d0d2a 100%)",
        backgroundSize: "28px 28px, 100%",
      }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
          boxShadow: "0 8px 40px rgba(124,58,237,0.35)",
        }}
      >
        <MessageSquare size={34} className="text-white" />
      </div>
      <div className="text-center">
        <h2 className="text-white text-xl font-bold mb-1.5">Your Messages</h2>
        <p className="text-slate-500 text-sm">Pick a conversation and start chatting</p>
      </div>
      <div className="flex gap-3 mt-1 opacity-30 text-2xl select-none">
        {["🚀", "💬", "✨", "🔥"].map(e => <span key={e}>{e}</span>)}
      </div>
    </div>
  );
}

export default function ChatArea({ chat, onSendMessage, onCall }) {
  const [input,    setInput   ] = useState("");
  const bottomRef               = useRef(null);
  const typingTimer             = useRef(null);
  const isTypingRef             = useRef(false);
  const currentUserId           = useRef((() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "");
      return u._id ?? u.id ?? null;
    } catch { return null; }
  })()).current;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.id, chat?.messages?.length, chat?.typing]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimer.current);
      if (isTypingRef.current && chat?.id) {
        socket.emit("stop_typing", { roomId: chat.id, senderId: currentUserId });
        isTypingRef.current = false;
      }
    };
  }, [chat?.id]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    if (!chat) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { roomId: chat.id, senderId: currentUserId });
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("stop_typing", { roomId: chat.id, senderId: currentUserId });
      isTypingRef.current = false;
    }, 1500);
  }, [chat]);

  const handleSend = () => {
    if (!input.trim() || !chat) return;
    const text = input.trim();
    clearTimeout(typingTimer.current);
    if (isTypingRef.current) {
      socket.emit("stop_typing", { roomId: chat.id, senderId: currentUserId });
      isTypingRef.current = false;
    }
    setInput("");
    onSendMessage(chat.id, text, chat.participantId);
  };

  const onKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!chat) return <EmptyState />;

  const isOnline = chat.status === "online";

  return (
    <div
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #0d0d2a 100%)" }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{
          background: "rgba(9,9,26,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Avatar name={chat.name} size="md" online={isOnline} />

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm leading-tight truncate">
            {chat.name}
          </h3>
          <p className={`text-xs mt-0.5 font-medium ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
            {isOnline ? "● Online" : `Last seen ${chat.lastSeen || "recently"}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          {[
            { Icon: Phone,        label: "Voice call", type: "audio" },
            { Icon: Video,        label: "Video call", type: "video" },
            { Icon: MoreVertical, label: "More",       type: null    },
          ].map(({ Icon, label, type }) => (
            <button
              key={label}
              title={label}
              onClick={() => type && onCall?.(type)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all duration-200"
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = "")}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5 chat-scrollbar"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      >
        <DateDivider label="Today" />

        {chat.messages.map(msg => (
          <Bubble key={msg.id} msg={msg} isMe={msg.sender === "me"} />
        ))}

        {/* Typing indicator */}
        {chat.typing && (
          <div className="flex items-end gap-2">
            <Avatar name={chat.name} size="sm" />
            <div
              className="flex gap-1.5 items-center px-4 py-3 rounded-2xl rounded-bl-sm border border-white/5"
              style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}
            >
              {[0, 0.2, 0.4].map(delay => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full typing-dot"
                  style={{ background: "rgba(148,163,184,0.7)", animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────── */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          background: "rgba(9,9,26,0.85)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2 border transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)";
            e.currentTarget.style.background  = "rgba(255,255,255,0.06)";
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.background  = "rgba(255,255,255,0.04)";
          }}
        >
          <button title="Attach" className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
            <Paperclip size={18} />
          </button>
          <button title="Image" className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
            <Image size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKey}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 text-sm outline-none py-1 min-w-0"
          />

          <button title="Emoji" className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
            <Smile size={18} />
          </button>

          {input.trim() ? (
            <button
              onClick={handleSend}
              title="Send"
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow:  "0 2px 14px rgba(124,58,237,0.5)",
              }}
            >
              <Send size={14} className="text-white translate-x-px" />
            </button>
          ) : (
            <button title="Voice" className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
