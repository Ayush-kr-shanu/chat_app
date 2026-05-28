import { io } from "socket.io-client";

const BASE_URL = "http://localhost:8181";

const socket = io(BASE_URL, {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: false,
  auth: (cb) => {
    // Always picks the latest token (even if set after module load)
    cb({ token: localStorage.getItem("accessToken") ?? "" });
  },
});

export default socket;