import { useState, useEffect, useRef } from "react";
import Sidebar       from "./components/Sidebar";
import ChatList      from "./components/ChatList";
import ChatArea      from "./components/ChatArea";
import NewChatModal  from "./components/NewChatModal";
import CallModal     from "./components/CallModal";
import socket        from "../../api/socket";
import { getConversations, getMessages, createConversation, sendMessage, markConversationSeen } from "../../api/chatApi";

const fmtTime = iso =>
  iso
    ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtRelative = iso => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return "now";
  if (min < 60)  return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
};

const shapeConversation = (conv, myId) => {
  const other = conv.participants?.find(p => {
    const id = p._id ?? p;
    return String(id) !== String(myId);
  });
  const name = other?.name ?? "Unknown";
  const lastMsg = conv.lastMessage;

  return {
    id:            conv._id,
    participantId: other?._id ?? other ?? null,
    name,
    status:        other?.status ?? "offline",
    lastSeen:    "recently",
    lastMessage: lastMsg?.text ?? "Start a conversation",
    lastTime:    fmtRelative(lastMsg?.createdAt ?? conv.updatedAt),
    unread:      conv.unreadCounts?.find(u => String(u.user) === String(myId))?.count ?? 0,
    isGroup:     conv.isGroup ?? false,
    typing:      false,
    messages:    [],
    _loaded:     false,
  };
};

const shapeMessage = (msg, myId) => ({
  id:     msg._id,
  sender: String(msg.sender?._id ?? msg.sender) === String(myId) ? "me" : "them",
  text:   msg.text,
  time:   fmtTime(msg.createdAt),
  status: msg.status ?? "sent",
});

export default function Chat() {
  const CURRENT_USER = useRef(
    localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : { id: "me", name: "You" }
  ).current;

  const [chats,          setChats         ] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loadingChats,   setLoadingChats  ] = useState(true);
  const [showNewChat,    setShowNewChat   ] = useState(false);
  const [callState,      setCallState     ] = useState(null);  // { status, callType, remoteUser:{id,name}, offer? }

  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => { selectedChatIdRef.current = selectedChatId; }, [selectedChatId]);

  const onlineUsersRef = useRef(new Set());
  const chatsRef       = useRef([]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  const tempToRealId = useRef(new Map());

  useEffect(() => {
    (async () => {
      try {
        const data = await getConversations();
        const myId = CURRENT_USER._id ?? CURRENT_USER.id;
        const shaped = data.map(c => shapeConversation(c, myId));

        const withStatus = shaped.map(c => ({
          ...c,
          status: c.participantId && onlineUsersRef.current.has(String(c.participantId))
            ? "online"
            : c.status,
        }));
        setChats(withStatus);

        withStatus.forEach(c => socket.emit("join_room", c.id));
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoadingChats(false);
      }
    })();
  }, []);

  useEffect(() => {
    const myId = CURRENT_USER._id ?? CURRENT_USER.id;
    socket.connect();

    socket.on("connect", () => {
      socket.emit("join", myId);
      // Re-join all rooms on every connect (handles server restarts / reconnects)
      chatsRef.current.forEach(c => socket.emit("join_room", c.id));
      console.log("[socket] connected, join sent for user:", myId);
    });

    socket.on("online_users", (onlineUserIds) => {
      const idSet = new Set(onlineUserIds.map(String));
      onlineUsersRef.current = idSet;
      setChats(prev => prev.map(c => ({
        ...c,
        status: c.participantId && idSet.has(String(c.participantId))
          ? "online"
          : "offline",
      })));
    });

    socket.on("receive_message", (message) => {
      const { id, roomId, senderId, text, time } = message;
      console.log("[socket] receive_message →", { id, roomId, senderId, text });
      const now      = time ?? fmtTime();
      const isActive = String(selectedChatIdRef.current) === String(roomId);

      socket.emit("message_delivered", { roomId, messageId: id });
      if (isActive) {
        socket.emit("mark_as_read", { roomId, userId: myId });
      }

      setChats(prev => {
        const exists = prev.find(c => String(c.id) === String(roomId));

        if (exists) {
          return prev.map(c => {
            if (String(c.id) !== String(roomId)) return c;
            // Deduplicate: skip if this message id already stored
            const alreadyHas = c.messages.some(m => String(m.id) === String(id));
            if (alreadyHas) return c;
            return {
              ...c,
              lastMessage: text,
              lastTime:    "now",
              unread:      isActive ? 0 : (c.unread || 0) + 1,
              messages:    [...c.messages, { id, sender: "them", text, time: now, status: "delivered" }],
            };
          });
        }

        getConversations()
          .then(data => {
            setChats(all => {
              const stillMissing = !all.find(c => String(c.id) === String(roomId));
              if (!stillMissing) return all;
              const fresh = data.find(c => String(c._id) === String(roomId));
              if (!fresh) return all;
              const shaped = shapeConversation(fresh, myId);
              return [{ ...shaped, messages: [{ id, sender: "them", text, time: now, status: "delivered" }] }, ...all];
            });
          })
          .catch(() => {});

        return prev;
      });
    });

    socket.on("typing", ({ senderId }) =>
      setChats(prev => prev.map(c =>
        String(c.participantId) === String(senderId) ? { ...c, typing: true } : c
      ))
    );
    socket.on("stop_typing", ({ senderId }) =>
      setChats(prev => prev.map(c =>
        String(c.participantId) === String(senderId) ? { ...c, typing: false } : c
      ))
    );

    socket.on("message_delivered", ({ messageId }) => {
      const resolvedId = tempToRealId.current.get(String(messageId)) ?? String(messageId);
      setChats(prev => prev.map(c => ({
        ...c,
        messages: c.messages.map(m =>
          String(m.id) === resolvedId || String(m.id) === String(messageId)
            ? { ...m, status: "delivered" } : m
        ),
      })));
    });

    socket.on("messages_delivered", ({ roomId }) => {
      setChats(prev => prev.map(c =>
        String(c.id) === String(roomId)
          ? { ...c, messages: c.messages.map(m => m.sender === "me" && m.status === "sent" ? { ...m, status: "delivered" } : m) }
          : c
      ));
    });

    socket.on("messages_read", ({ roomId }) => {
      setChats(prev => prev.map(c =>
        String(c.id) === String(roomId)
          ? { ...c, messages: c.messages.map(m => m.sender === "me" ? { ...m, status: "read" } : m) }
          : c
      ));
    });

    socket.on("incoming_call", ({ from, offer, callType }) => {
      const callerChat = chatsRef.current.find(c => String(c.participantId) === String(from));
      setCallState({
        status:     "incoming",
        callType,
        offer,
        remoteUser: { id: from, name: callerChat?.name ?? "Unknown" },
      });
    });

    return () => {
      socket.off("connect");
      socket.off("online_users");
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("message_delivered");
      socket.off("messages_delivered");
      socket.off("messages_read");
      socket.off("incoming_call");
      socket.disconnect();
    };
  }, []);

  const handleSelectChat = async id => {
    const myId = CURRENT_USER._id ?? CURRENT_USER.id;
    setSelectedChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    socket.emit("join_room", id);

    const already = chats.find(c => c.id === id);
    if (already?._loaded) {
      socket.emit("mark_as_read", { roomId: id, userId: myId });
      markConversationSeen(id).catch(() => {});
      return;
    }

    try {
      const msgs = await getMessages(id);
      const apiMessages = msgs.map(m => shapeMessage(m, myId));

      const apiSigs = new Set(apiMessages.map(m => `${m.sender}::${m.text}`));

      setChats(prev =>
        prev.map(c => {
          if (c.id !== id) return c;
          const pending = c.messages.filter(
            m => typeof m.id === 'number' && !apiSigs.has(`${m.sender}::${m.text}`)
          );
          return { ...c, _loaded: true, messages: [...apiMessages, ...pending] };
        })
      );
      // Emit AFTER messages are in state so the sender sees read ticks immediately
      socket.emit("mark_as_read", { roomId: id, userId: myId });
      markConversationSeen(id).catch(() => {});
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // ── 4. Send message ──────────────────────────────────────────
  const handleSendMessage = (chatId, text, receiverId) => {
    const myId   = CURRENT_USER._id ?? CURRENT_USER.id;
    const now    = fmtTime();
    const tempId = Date.now();

    // Optimistic add with temp id
    setChats(prev => prev.map(c =>
      c.id === chatId
        ? {
            ...c,
            lastMessage: text,
            lastTime:    "now",
            messages:    [...c.messages, { id: tempId, sender: "me", text, time: now, status: "sent" }],
          }
        : c
    ));

    // Emit socket IMMEDIATELY — don't wait for DB save so receiver gets the
    // message right away and the tick updates without a noticeable delay.
    socket.emit("send_message", {
      roomId:     chatId,
      receiverId,
      message: { id: tempId, roomId: chatId, senderId: myId, text, time: now, status: "sent" },
    });

    // Persist to DB concurrently; swap tempId → realId once we have it.
    sendMessage(chatId, text)
      .then(saved => {
        const realId = String(saved._id ?? saved.id ?? tempId);
        // Keep a lookup so message_delivered can match after the swap
        tempToRealId.current.set(String(tempId), realId);
        setChats(prev => prev.map(c =>
          c.id === chatId
            ? { ...c, messages: c.messages.map(m => m.id === tempId ? { ...m, id: realId } : m) }
            : c
        ));
      })
      .catch(err => console.error("Failed to save message:", err));
  };

  const handleStartChat = async user => {
    setShowNewChat(false);

    // If a conversation with this user already exists, just open it
    const existing = chats.find(c => c.name === user.name);
    if (existing) { handleSelectChat(existing.id); return; }

    try {
      const conv = await createConversation(user._id);
      const shaped = shapeConversation(
        { ...conv, participants: [user, CURRENT_USER] },
        CURRENT_USER._id ?? CURRENT_USER.id
      );
      setChats(prev => [{ ...shaped, _loaded: true }, ...prev]);
      setSelectedChatId(shaped.id);
      socket.emit("join_room", shaped.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleCall = (callType) => {
    if (!selectedChat?.participantId) return;
    setCallState({
      status:     "outgoing",
      callType,
      remoteUser: { id: selectedChat.participantId, name: selectedChat.name },
    });
  };

  const selectedChat = chats.find(c => c.id === selectedChatId) ?? null;

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #0d0d2a 100%)" }}
    >
      <Sidebar  currentUser={CURRENT_USER} />
      <ChatList
        chats={chats}
        loading={loadingChats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={() => setShowNewChat(true)}
      />
      <ChatArea chat={selectedChat} onSendMessage={handleSendMessage} onCall={handleCall} />

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onStartChat={handleStartChat}
        />
      )}

      {callState && (
        <CallModal
          callState={callState}
          currentUserId={CURRENT_USER._id ?? CURRENT_USER.id}
          onClose={() => setCallState(null)}
        />
      )}
    </div>
  );
}

