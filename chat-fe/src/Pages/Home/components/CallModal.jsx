import { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming,
} from "lucide-react";
import Avatar from "./Avatar";
import socket from "../../../api/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

const fmtDuration = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function createDialTone(ctx) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.connect(ctx.destination);

  const oscs = [350, 440].map(freq => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(gain);
    o.start();
    return o;
  });

  let timer;
  const beep = () => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.setValueAtTime(0,    t + 0.4);
    timer = setTimeout(beep, 3000);
  };
  beep();

  return () => {
    clearTimeout(timer);
    oscs.forEach(o => { try { o.stop(); } catch {} });
    gain.disconnect();
  };
}

function createRingTone(ctx) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.connect(ctx.destination);

  const oscs = [480, 620].map(freq => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(gain);
    o.start();
    return o;
  });

  let timer;
  const ring = () => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    // burst 1
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.setValueAtTime(0,    t + 0.4);
    // burst 2
    gain.gain.setValueAtTime(0.25, t + 0.6);
    gain.gain.setValueAtTime(0,    t + 1.0);
    timer = setTimeout(ring, 3500);
  };
  ring();

  return () => {
    clearTimeout(timer);
    oscs.forEach(o => { try { o.stop(); } catch {} });
    gain.disconnect();
  };
}

export default function CallModal({ callState, currentUserId, onClose }) {
//   callState: { status: 'outgoing'|'incoming', callType: 'audio'|'video', remoteUser: {id,name}, offer? }
  const [status,    setStatus   ] = useState(callState.status);  // outgoing | incoming | active
  const [muted,     setMuted    ] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration,  setDuration ] = useState(0);
  const [error,     setError    ] = useState(null);

  const pcRef             = useRef(null);
  const localStreamRef    = useRef(null);
  const remoteStreamRef   = useRef(null);
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const timerRef          = useRef(null);
  const ringStopRef       = useRef(null);
  const iceCandidateQueue = useRef([]);     // holds ICE candidates arriving before remoteDescription

  const stopRing = () => {
    ringStopRef.current?.();
    ringStopRef.current = null;
  };

  // Drain ICE candidates that were queued before setRemoteDescription
  const drainICEQueue = async (pc) => {
    for (const c of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceCandidateQueue.current = [];
  };

  const { callType, remoteUser, offer } = callState;
  const isVideo = callType === "video";

  // ── cleanup ────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopRing();
    clearInterval(timerRef.current);
    if (localVideoRef.current)  { localVideoRef.current.srcObject  = null; }
    if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    localStreamRef.current  = null;
    remoteStreamRef.current = null;
    pcRef.current = null;
    onClose();
  }, [onClose]);

  // Always release camera/mic if the modal unmounts for any reason
  useEffect(() => () => {
    stopRing();
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
  }, []);

  // ── Start ring/dial tone based on call status ────────────────────
  useEffect(() => {
    stopRing();
    if (status === "active") return;  // call connected — no ring needed
    try {
      const ctx  = new AudioContext();
      const stop = status === "outgoing" ? createDialTone(ctx) : createRingTone(ctx);
      ringStopRef.current = () => { stop(); ctx.close(); };
    } catch {}
    return stopRing;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── helpers ────────────────────────────────────────────────────
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("ice_candidate", { to: remoteUser.id, candidate });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        setError("Call connection failed. Check your network and try again.");
      }
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pcRef.current = pc;
    return pc;
  }, [remoteUser.id]);

  const getMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(
        new Error("Camera/microphone API unavailable"),
        { name: "NotSecureError" }
      );
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [isVideo]);

  const startTimer = () => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  // Apply remote stream once the media element mounts (status → active)
  useEffect(() => {
    if (status === "active" && remoteStreamRef.current && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [status]);

  // ── initiate call (caller) ─────────────────────────────────────
  useEffect(() => {
    if (callState.status !== "outgoing") return;

    // Use a cancelled flag instead of startedRef so React Strict Mode's second
    // invocation creates a fresh (non-closed) RTCPeerConnection successfully.
    let cancelled = false;

    (async () => {
      try {
        const pc     = createPC();
        const stream = await getMedia();
        if (cancelled || pc.signalingState === "closed") {
          stream.getTracks().forEach((t) => t.stop());
          // Do NOT touch pcRef.current here — by this point the second
          // Strict Mode run may have already written its fresh PC into it.
          return;
        }
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offerSDP = await pc.createOffer();
        await pc.setLocalDescription(offerSDP);
        // Re-assert pcRef in case a Strict Mode cancelled run cleared it after we started.
        pcRef.current = pc;
        socket.emit("call_user", {
          to:       remoteUser.id,
          from:     currentUserId,
          offer:    offerSDP,
          callType,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[call] outgoing setup failed:", err);
        const msg =
          err?.name === "NotSecureError"   ? "Open the app over HTTPS (https://...) — camera access requires a secure connection." :
          err?.name === "NotAllowedError"  ? "Camera/microphone permission denied." :
          err?.name === "NotFoundError"    ? "No camera or microphone found." :
          err?.name === "NotReadableError" ? "Camera is already in use by another app." :
          "Could not start the call. Please try again.";
        setError(msg);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── socket listeners ───────────────────────────────────────────
  useEffect(() => {
    const onCallAnswered = async ({ answer }) => {
      try {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await drainICEQueue(pc);
        setStatus("active");
        startTimer();
      } catch (err) {
        console.error("[call] setRemoteDescription failed:", err);
        setError("Call connection failed. Please try again.");
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        const pc = pcRef.current;
        if (!candidate || !pc) return;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Remote description not set yet — queue it
          iceCandidateQueue.current.push(candidate);
        }
      } catch (err) {
        console.warn("[call] addIceCandidate failed:", err);
      }
    };

    const onCallRejected = () => cleanup();
    const onCallEnded    = () => cleanup();

    socket.on("call_answered",  onCallAnswered);
    socket.on("ice_candidate",  onIceCandidate);
    socket.on("call_rejected",  onCallRejected);
    socket.on("call_ended",     onCallEnded);

    return () => {
      socket.off("call_answered",  onCallAnswered);
      socket.off("ice_candidate",  onIceCandidate);
      socket.off("call_rejected",  onCallRejected);
      socket.off("call_ended",     onCallEnded);
    };
  }, [cleanup]);

  // ── actions ────────────────────────────────────────────────────
  const handleAccept = async () => {
    try {
      const pc     = createPC();
      const stream = await getMedia();
      if (pc.signalingState === "closed") {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await drainICEQueue(pc);   // apply any ICE candidates that arrived before accept
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer_call", { to: remoteUser.id, answer });
      setStatus("active");
      startTimer();
    } catch (err) {
      console.error("[call] handleAccept failed:", err);
      const msg =
        err?.name === "NotAllowedError"  ? "Camera/microphone permission denied." :
        err?.name === "NotFoundError"    ? "No camera or microphone found." :
        err?.name === "NotReadableError" ? "Camera is already in use by another app." :
        "Could not answer the call. Please try again.";
      setError(msg);
    }
  };

  const handleReject = () => {
    socket.emit("reject_call", { to: remoteUser.id });
    cleanup();
  };

  const handleHangUp = () => {
    socket.emit("end_call", { to: remoteUser.id });
    cleanup();
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted((m) => !m); }
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCameraOff((c) => !c); }
  };

  // ── render ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
    >
      {/* ── Error state ──────────────────────────────────────── */}
      {error ? (
        <div
          className="w-80 rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl text-center"
          style={{ background: "linear-gradient(160deg, #1a1a3e 0%, #0d0d2a 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
            <PhoneOff size={24} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Call Failed</p>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
          <button
            onClick={cleanup}
            className="px-6 py-2 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            Close
          </button>
        </div>
      ) : status === "active" && isVideo ? (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video PiP */}
          <div className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Name + timer overlay */}
          <div className="absolute top-4 left-4">
            <p className="text-white font-semibold text-lg">{remoteUser.name}</p>
            <p className="text-white/60 text-sm">{fmtDuration(duration)}</p>
          </div>

          {/* Controls */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <ControlBtn onClick={toggleMute}      active={muted}      Icon={muted      ? MicOff    : Mic}     label="Mute" />
            <ControlBtn onClick={toggleCamera}    active={cameraOff}  Icon={cameraOff  ? VideoOff  : Video}   label="Camera" />
            <button
              onClick={handleHangUp}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95"
              style={{ background: "#ef4444" }}
              title="End call"
            >
              <PhoneOff size={22} className="text-white" />
            </button>
          </div>
        </div>

      ) : (
        /* ── Outgoing / Incoming / Active AUDIO card ─────────── */
        <div
          className="w-80 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl"
          style={{
            background:   "linear-gradient(160deg, #1a1a3e 0%, #0d0d2a 100%)",
            border:       "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Avatar */}
          <div className="relative">
            <Avatar name={remoteUser.name} size="xl" />
            {/* Ripple rings for ringing states */}
            {status !== "active" && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ background: isVideo ? "#7c3aed" : "#06b6d4" }} />
                <span className="absolute -inset-2 rounded-full animate-ping opacity-10 animation-delay-300"
                  style={{ background: isVideo ? "#7c3aed" : "#06b6d4" }} />
              </>
            )}
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-xl">{remoteUser.name}</p>
            <p className="text-slate-400 text-sm mt-1">
              {status === "outgoing" && `Calling… (${isVideo ? "Video" : "Voice"})`}
              {status === "incoming" && `Incoming ${isVideo ? "video" : "voice"} call`}
              {status === "active"   && fmtDuration(duration)}
            </p>
          </div>

          {/* Hidden audio element for active audio calls */}
          {status === "active" && !isVideo && (
            <audio ref={remoteVideoRef} autoPlay />
          )}

          {/* Controls */}
          {status === "outgoing" && (
            <div className="flex items-center justify-center gap-6 w-full mt-2">
              <ControlBtn onClick={toggleMute} active={muted} Icon={muted ? MicOff : Mic} label="Mute" />
              <HangUpBtn onClick={handleHangUp} label="Cancel" />
            </div>
          )}

          {status === "incoming" && (
            <div className="flex items-center justify-center gap-8 w-full mt-2">
              {/* Reject */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleReject}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "#ef4444" }}
                >
                  <PhoneOff size={20} className="text-white" />
                </button>
                <span className="text-slate-400 text-xs">Decline</span>
              </div>
              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "#22c55e" }}
                >
                  {isVideo ? <Video size={20} className="text-white" /> : <Phone size={20} className="text-white" />}
                </button>
                <span className="text-slate-400 text-xs">Accept</span>
              </div>
            </div>
          )}

          {status === "active" && (
            <div className="flex items-center justify-center gap-6 w-full mt-2">
              <ControlBtn onClick={toggleMute} active={muted} Icon={muted ? MicOff : Mic} label="Mute" />
              <HangUpBtn onClick={handleHangUp} label="End" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ControlBtn({ onClick, active, Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Icon size={18} className="text-white" />
      </button>
      <span className="text-slate-500 text-xs">{label}</span>
    </div>
  );
}

function HangUpBtn({ onClick, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#ef4444" }}
      >
        <PhoneOff size={20} className="text-white" />
      </button>
      <span className="text-slate-500 text-xs">{label}</span>
    </div>
  );
}
