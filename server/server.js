import express from 'express';
import "dotenv/config.js";
import cors from 'cors';
import http from 'http';
import { connectDB } from './lib/db.js';
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import { Server } from 'socket.io';

// Create Express + HTTP server
const app = express();
const server = http.createServer(app);

// -------------------- CORS CONFIG --------------------
const LOCAL_FRONTEND = "http://localhost:5173";
const PROD_FRONTEND = "https://YOUR_FRONTEND_NAME.vercel.app"; // 🔥 Yahan apna real vercel URL daal dena

const allowedOrigins = [LOCAL_FRONTEND, PROD_FRONTEND];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ------------- SOCKET.IO CORS FIX --------------------
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Store Online Users
export const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("✅ User connected:", userId);

  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// -------------------- MIDDLEWARES --------------------
app.use(express.json({ limit: '4mb' }));

// -------------------- ROUTES --------------------
app.get("/api/status", (req, res) => res.send("✅ Server is live!"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/user", userRouter);

// -------------------- DB CONNECT --------------------
await connectDB();

// -------------------- LOCAL RUN ONLY --------------------
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`🚀 Server running on PORT: ${PORT}`));
}

// -------------------- EXPORT FOR VERCEL --------------------
export default server;
