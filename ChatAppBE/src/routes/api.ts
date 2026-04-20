import express from "express";
import random from "../utils/random.js";
import type { RoomData } from "../types/room.js";

export function createApiRouter(rooms: Map<string, RoomData>) {
  const router = express.Router();

  // Create a new room
  router.post("/create", (req, res) => {
    const roomCode = random(6);
    rooms.set(roomCode, {
      messageHistory: [],
      createdAt: Date.now(),
      clientsMap: new Map(),
    });
    res.json({
      roomCode,
    });
  });

  // Check if room exists
  router.post("/room/:roomCode", (req, res) => {
    if (rooms.has(req.params.roomCode))
      return res.json({ message: "Valid room" });
    else return res.status(404).json({ message: "Invalid room" });
  });

  return router;
}
