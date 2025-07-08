import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import connectDB from './db.js';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Room from './models/Room.js';

const app = express();
connectDB();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://collaborative-artwork-r1euw3rrz-greeshma-shettigars-projects.vercel.app",
    "https://collaborative-artwork-4n20zomff-greeshma-shettigars-projects.vercel.app",
    "https://collaborative-artwork-d5e6xnhon-greeshma-shettigars-projects.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashed });
    await newUser.save();
    res.status(200).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

app.post('/create-room', async (req, res) => {
  const { name, roomId } = req.body;

  try {
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room ID already exists!' });
    }

    const room = new Room({ name, roomId });
    await room.save();

    res.status(201).json({ message: 'Room created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/join-room', async (req, res) => {
  const { roomId } = req.body;

  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room ID does not exist!' });
    }

    res.status(200).json({ message: 'Joined room successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- No frontend routes served by backend (Vercel handles it)

const roomUsers = {};
const socketToRoom = {}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://collaborative-artwork-d5e6xnhon-greeshma-shettigars-projects.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = new Set();
    }

    if (roomUsers[roomId].size >= 2) {
      socket.emit("room-full", { message: "Room is full. Only 2 users allowed." });
      return;
    }

    roomUsers[roomId].add(socket.id);
    socketToRoom[socket.id]=roomId;
    socket.join(roomId);
    console.log(`✅ ${username} joined room: ${roomId}`);

    io.to(roomId).emit("user-joined", { socketId: socket.id, username });
  });

  socket.on("remote-path", (data) => {
    const roomId = socketToRoom[socket.id];
    if (roomId) {
      socket.to(roomId).emit("remote-path", data);
    }
  });


  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomUsers[roomId]) {
        roomUsers[roomId].delete(socket.id);
        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
        }
      }
    }
     delete socketToRoom[socket.id];

    console.log(`🔴 User disconnected: ${socket.id}`);
  });
  socket.on("leave-room", ({ roomId, username }) => {
  if (roomUsers[roomId]) {
    roomUsers[roomId].delete(socket.id);
    if (roomUsers[roomId].size === 0) {
      delete roomUsers[roomId];
    }
  }
  socket.leave(roomId);
  delete socketToRoom[socket.id];

  console.log(`👋 ${username} left room: ${roomId}`);
});

});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

