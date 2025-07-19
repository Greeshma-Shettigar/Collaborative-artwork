// server/server.js

// 1. Load environment variables first (this should be at the very top)
//    Assuming your .env is in the same directory as server.js
import 'dotenv/config';

// 2. IMMEDIATELY AFTER dotenv.config(), add your console.log
console.log("Backend JWT_SECRET (from .env):", process.env.JWT_SECRET);

// General imports
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken'; // For JWT authentication
import bcrypt from 'bcryptjs'; // For password hashing

// Database and Models
import connectDB from './db.js';
import User from './models/User.js';
import Room from './models/Room.js';

// AI-related routes - ONLY colormindRoute remains
import colormindRoute from './colormindRoute.js';

// --- IMPORTANT: Use the authenticateToken from utils/authMiddleware.js for HTTP routes ---
import { authenticateToken } from './utils/authMiddleware.js'; // This is for Express routes (req, res, next)

// --- Define the Socket.IO middleware here (or import from a dedicated file if preferred later) ---
// Note: We are keeping the existing inline Socket.IO middleware from your original file,
// and adding debug logs to it. No separate import needed here for socketAuthMiddleware.js
// if you choose to keep it inline.

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO

// Connect to MongoDB
connectDB();

// --- CORS Configuration ---
const allowedOrigins = [
  "http://localhost:5173", // Frontend dev server
  "http://localhost:5174", // Frontend dev server (if you use a different one)
  "https://collaborative-artwork-r1euw3rrz-greeshma-shettigars-projects.vercel.app",
  "https://collaborative-artwork-4n20zomff-greeshma-shettigars-projects.vercel.app",
  "https://collaborative-artwork-d5e6xnhon-greeshma-shettigars-projects.vercel.app",
  "https://collaborative-artwork.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

// Express middleware for JSON and URL-encoded bodies
// Increased limit for potential large canvas data (base64 images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- API Routes ---
app.use('/api', colormindRoute);

// In-memory store for blacklisted JWTs (for logout invalidation)
const blacklistedTokens = new Set();

// NOTE: The `authenticateToken` function is now imported from './utils/authMiddleware.js'.
// The inline definition of `function authenticateToken(...) { ... }` that was previously here
// has been removed to avoid conflicts and ensure consistency.

// --- User Authentication Routes ---

// Register User
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists. Please choose a different one.' }); // 409 Conflict
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' }); // 201 Created
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: 'Error registering user. Please try again.' });
  }
});

// Login User
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' }); // 401 Unauthorized
    }

    // Generate JWT token upon successful login
    const token = jwt.sign(
      { id: user._id, username: user.username }, // Payload
      process.env.JWT_SECRET, // Secret key from .env
      { expiresIn: '1h' } // Token expires in 1 hour
    );
    console.log(`User ${token} logged in successfully. Token generated.`);
    res.status(200).json({ message: 'Login successful', token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Login error. Please try again.' });
  }
});

// Logout User
// Uses the imported authenticateToken for HTTP route protection
app.post('/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token && process.env.NODE_ENV !== 'development') { // Only blacklist in non-dev env by default
    blacklistedTokens.add(token);
  }
  res.status(200).json({ message: 'Logged out successfully' });
});

// --- Room Management Routes (HTTP) ---

// Create Room
// Uses the imported authenticateToken for HTTP route protection
app.post('/create-room', authenticateToken, async (req, res) => {
  const { roomId } = req.body;

  try {
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(409).json({ message: 'Room ID already exists! Please choose another.' });
    }

    const newRoom = new Room({ roomId, creatorId: req.user.id });
    await newRoom.save();

    res.status(201).json({ message: 'Room created successfully', roomId: newRoom.roomId });
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ message: 'Server error creating room. Please try again.' });
  }
});

// Join Room (HTTP) - primarily checks if room exists in DB
// Uses the imported authenticateToken for HTTP route protection
app.post('/join-room', authenticateToken, async (req, res) => {
  const { roomId } = req.body;

  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room ID does not exist! Please check the ID or create a new room.' });
    }

    res.status(200).json({ message: 'Room found successfully. Proceed to join via WebSocket.' });
  } catch (err) {
    console.error("Join room error:", err);
    res.status(500).json({ message: 'Server error checking room. Please try again.' });
  }
});

// Basic server status endpoint
app.get('/', (req, res) => {
  res.send('CoArtistry Backend Server is running.');
});

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Use the same allowed origins as Express
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100 MB, for potentially large base64 canvas data
});

// In-memory maps for active Socket.IO connections and room state
const roomUsers = {}; // { roomId: { socketId: { username, userId } } } - Tracks active users in a room
const socketToRoom = {}; // { socketId: roomId } - Maps a socket ID to the room it joined
const socketToUser = {}; // { socketId: { username, userId } } - Stores user info for a socket

// --- Socket.IO Authentication Middleware (Inline) ---
io.use((socket, next) => {
  // --- ADDED DEBUGGING LINES HERE ---
  console.log("--- DEBUGGING JWT_SECRET INSIDE INLINE SOCKET.IO MIDDLEWARE ---");
  console.log("process.env.JWT_SECRET value at Socket.IO verification:", process.env.JWT_SECRET);
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length === 0) {
      console.error("CRITICAL ERROR: JWT_SECRET IS UNDEFINED OR EMPTY when verifying Socket.IO token!");
      return next(new Error('Server misconfiguration: JWT secret not loaded for Socket.IO.'));
  }
  console.log("--- END DEBUGGING ---");
  // --- END ADDED LINES ---

  const token = socket.handshake.auth.token; // Client must send token in `auth` object during connection

  if (!token) {
    return next(new Error('Authentication failed: No token provided. Please log in.'));
  }

  if (blacklistedTokens.has(token)) {
    return next(new Error('Authentication failed: Token logged out or invalid.'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Socket JWT Verification Error:", err.message);
      return next(new Error('Authentication failed: Invalid or expired token.'));
    }
    socket.user = user;
    next();
  });
});

// --- Socket.IO Connection and Event Handling ---
io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id} (Authenticated as: ${socket.user.username})`);

  socketToUser[socket.id] = { username: socket.user.username, userId: socket.user.id };

  // Event: Client requests to join a room
  socket.on("join-room", async ({ roomId, username }) => {
    const displayUsername = socket.user.username || username; // Prioritize JWT username

    const roomExistsInDB = await Room.findOne({ roomId });
    if (!roomExistsInDB) {
      socket.emit("room-error", { message: "Room does not exist. Please check the Room ID or create it first." });
      return;
    }

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = {};
    }

    const currentUsersInRoom = Object.keys(roomUsers[roomId]).length;
    if (currentUsersInRoom >= 2) { // Max 2 users allowed for collaboration
      socket.emit("room-full", { message: "Room is currently full. Only 2 users allowed per room." });
      return;
    }

    roomUsers[roomId][socket.id] = { username: displayUsername, userId: socket.user.id };
    socketToRoom[socket.id] = roomId;
    socket.join(roomId);

    console.log(`✅ ${displayUsername} (${socket.id}) joined room: ${roomId}. Current users in room: ${Object.keys(roomUsers[roomId]).map(id => roomUsers[roomId][id].username).join(', ')}`);

    io.to(roomId).emit("user-joined", {
      socketId: socket.id,
      username: displayUsername,
      usersInRoom: Object.values(roomUsers[roomId])
    });
  });

  // Event: Client sends color change
  socket.on("color-change", ({ color, roomId }) => {
    if (socket.rooms.has(roomId)) {
      socket.to(roomId).emit("color-updated", color);
    }
  });

  // Event: Client sends flood fill data
  socket.on("flood-fill", ({ x, y, fillColor, roomId }) => {
    if (socket.rooms.has(roomId)) {
      socket.to(roomId).emit("flood-fill", { x, y, fillColor });
    }
  });

  // Event: Client sends drawing path data (e.g., pen strokes)
  socket.on("remote-path", (data) => {
    const roomId = socketToRoom[socket.id];
    if (roomId && socket.rooms.has(roomId)) {
      socket.to(roomId).emit("remote-path", data);
    }
  });

  // Event: Client sends full canvas state update (e.g., for initial sync)
  socket.on("canvas-state-update", ({ roomId, paths }) => {
    if (roomId && socket.rooms.has(roomId)) {
      console.log(`Received canvas state update from room ${roomId}. Broadcasting...`);
      io.to(roomId).emit("canvas-state-update", { roomId, paths });
    }
  });

  // Event: Client explicitly leaves a room
  socket.on("leave-room", ({ roomId }) => {
    const username = socketToUser[socket.id]?.username;
    if (roomUsers[roomId] && roomUsers[roomId][socket.id]) {
      delete roomUsers[roomId][socket.id];

      if (Object.keys(roomUsers[roomId]).length === 0) {
        delete roomUsers[roomId];
      }
    }

    socket.leave(roomId);
    delete socketToRoom[socket.id];
    delete socketToUser[socket.id];

    console.log(`👋 ${username} (${socket.id}) left room: ${roomId}`);
    io.to(roomId).emit("user-left", {
      socketId: socket.id,
      username,
      usersInRoom: roomUsers[roomId] ? Object.values(roomUsers[roomId]) : []
    });
  });

  // Event: Socket is about to disconnect (useful for final cleanup)
  socket.on("disconnecting", () => {
    const roomsToLeave = Array.from(socket.rooms).filter(room => room !== socket.id);

    for (const roomId of roomsToLeave) {
      if (roomUsers[roomId] && roomUsers[roomId][socket.id]) {
        const username = roomUsers[roomId][socket.id].username;
        delete roomUsers[roomId][socket.id];

        if (Object.keys(roomUsers[roomId]).length === 0) {
          delete roomUsers[roomId];
        }

        console.log(`🔴 ${username} (${socket.id}) disconnecting from room: ${roomId}`);
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          username,
          usersInRoom: roomUsers[roomId] ? Object.values(roomUsers[roomId]) : []
        });
      }
    }
    delete socketToRoom[socket.id];
    delete socketToUser[socket.id];
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 CoArtistry Backend Server running on port ${PORT}`);
});