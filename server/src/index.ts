import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createRoom, startGame, joinRoom, getRoom, removePlayer } from "./game/RoomManager";

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

function emitPlayerList(code: string) {
  const room = getRoom(code);
  if (room) {
    io.to(code).emit("playerList", room.players.map((p) => p.name));
  }
}

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on("createRoom", (name: string, callback) => {
    const room = createRoom(socket.id, name);
    socket.join(room.code);
    emitPlayerList(room.code);
    callback({ code: room.code });
  });

  socket.on("joinRoom", (data: { code: string; name: string }, callback) => {
    const room = joinRoom(data.code, socket.id, data.name);
    if (room) {
      socket.join(data.code);
      emitPlayerList(data.code);
      callback({ success: true, code: data.code });
    } else {
      callback({ success: false, message: "Room not found" });
    }
  });

  socket.on("disconnect", () => {
    removePlayer(socket.id);
    // Optionally, emit updated player lists to all rooms
    for (const room of io.sockets.adapter.rooms.keys()) {
      emitPlayerList(room);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on("startGame", (code: string, callback) => {
    const result = startGame(code);
    if (!result) {
      callback({ success: false, message: "Not enough players or room not found!" });
      return;
    }
    // Notify all players in the room of their word/imposter status
    for (const p of result.players) {
      io.to(p.id).emit("gameStarted", {
        word: result.words![p.id],
        isImposter: p.id === result.imposterId,
      });
    }
    callback({ success: true });
  });
  //add above

socket.on("startVoting", (code: string) => {
  // Notify all players in the room to start voting
  io.to(code).emit("startVoting");
});

});

app.get("/", (_req, res) => {
  res.send("Server is running!");
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});