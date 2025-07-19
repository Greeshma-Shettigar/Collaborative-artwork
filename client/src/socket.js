// socket.js
import { io } from "socket.io-client";

const server =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

// Export a function that creates and returns the socket instance
// This function should be called ONLY when you have the token.
export const createSocket = (token) => {
  if (!token) {
    console.error("Attempted to create socket without a token.");
    // You might throw an error or return null, depending on your error handling
    return null;
  }

  console.log("Creating Socket.IO connection with token:", token ? "Token provided" : "No token"); // More precise log

  const connectionOptions = {
    "force new connection": true,
    reconnectionAttempts: "Infinity",
    timeout: 10000,
    transports: ["websocket"],
    auth: {
      token: token, // Use the token passed to the function
    },
  };

  const socket = io(server, connectionOptions);

  socket.on('connect', () => {
    console.log('Socket connected successfully with ID:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    if (err.message.includes("Authentication failed")) {
      alert("Real-time collaboration requires you to be logged in. Please log in again.");
      // Optionally, redirect to login page here if you have routing available
      // window.location.href = '/login';
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
  });

  return socket;
};

// DO NOT export default socket; anymore.
// Instead, individual components will create their socket.