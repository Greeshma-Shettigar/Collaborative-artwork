// socket.js
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000", {
  transports: ["websocket"], // force websocket
});

export default socket;
