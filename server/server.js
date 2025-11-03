import express from 'express';
import "dotenv/config.js";
import cors from 'cors';
import http from 'http';
import { connectDB } from './lib/db.js';
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import { Server } from 'socket.io';

// Create an Express app and HTTP server
const app = express();
const server = http.createServer(app);

// ✅ Proper CORS configuration for frontend
const FRONTEND_URL = "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // allow cookies / auth headers
  })
);

// ✅ Socket.io CORS fix
export const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

// Store Online Users { userId: socketId }
export const userSocketMap = {};

// Socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("✅ User connected:", userId);

  if (userId) userSocketMap[userId] = socket.id;

  // Emit list of online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Middleware setup
app.use(express.json({ limit: '4mb' }));

// Routes setup
app.use("/api/status", (req, res) => res.send("✅ Server is live!"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/user", userRouter);

// Connect to MongoDB
await connectDB();
if(process.env.NODE_ENV !== "production"){
  const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on PORT: ${PORT}`));
}

//export server for vercel
export default server;
