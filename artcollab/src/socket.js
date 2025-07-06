import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_SOCKET_URL || "https://collaborative-artwork-gf2e.onrender.com",
  {
    transports: ["polling"], // use polling because WebSockets are not fully supported on Render Free
  }
);

export default socket;
