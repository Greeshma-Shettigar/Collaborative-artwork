// socket.js
import { io } from "socket.io-client";

const server =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"], // ensure only websocket
};

const socket = io(server, connectionOptions);

export default socket;
