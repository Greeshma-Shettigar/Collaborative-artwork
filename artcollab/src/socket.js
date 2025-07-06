import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000", {
  transports: ["websocket"], // force proper transport
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000,
});

export default socket;
