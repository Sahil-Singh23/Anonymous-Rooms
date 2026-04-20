import express from "express";
import { WebSocketServer,WebSocket } from "ws";
import cors from 'cors';
import helmet from "helmet";
import random from "./utils/random.js";
import * as dotenv from 'dotenv';

import passport from "passport";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/s3files.js"
import profileRoutes from "./routes/profile.js"
import { createApiRouter } from "./routes/api.js"
import { startFileCleanupJob } from "./jobs/fileCleanup.js";
import { globalLimiter, apiLimiter, checkWebSocketRateLimit, cleanupWebSocketRateLimiters } from "./middlewares/rateLimiter.js";
import { sanitizeMessage } from "./utils/messageSanitizer.js";
import { validateUsername, validateRoomCode } from "./utils/validators.js";
import type { Message, RoomData, ClientInfo } from "./types/room.js";
import {client} from "./prisma.js"

dotenv.config();
const PORT = Number(process.env.PORT) || 8000;
const app = express();

// Security headers (helmet)
app.use(helmet());

// Request size limits: 10KB JSON, 50KB raw
app.use(express.json({ limit: "10kb" }));
app.use(express.raw({ limit: "50kb" }));

app.use(cors({origin:["https://rooms.sahils.tech","http://localhost:2005"],credentials: true}));
app.use(cookieParser());
app.use(globalLimiter); // Apply global rate limiting

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
const wss = new WebSocketServer({
  noServer: true
});

// Handle WebSocket upgrade manually
server.on("upgrade", (req, socket, head) => {
  const origin = req.headers.origin as string | undefined;

  const allowed =
    !origin ||
    origin === "https://rooms.sahils.tech" ||
    origin === "https://apichatapp.duckdns.org" ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:2005";

  if (!allowed) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

// Periodic cleanup: Delete empty rooms after 5-10 minutes
const EMPTY_ROOM_TIMEOUT = 10 * 60 * 1000; 
const CLEANUP_INTERVAL = 2 * 60 * 1000; 

setInterval(() => {
  const now = Date.now();
  const roomsToDelete: string[] = [];
  
  for (const [roomCode, roomData] of rooms.entries()) {
    // If room is empty and has been empty for more than 10 minutes, delete it
    if (roomData.clientsMap.size === 0 && roomData.emptyingSince) {
      const emptyDuration = now - roomData.emptyingSince;
      if (emptyDuration > EMPTY_ROOM_TIMEOUT) {
        roomsToDelete.push(roomCode);
      }
    }
  }
  for (const roomCode of roomsToDelete) {
    rooms.delete(roomCode);
  }

  // Clean up old WebSocket rate limiters to prevent memory leaks
  cleanupWebSocketRateLimiters();
}, CLEANUP_INTERVAL);

// Start file cleanup job - deletes expired files from S3 every hour
startFileCleanupJob();

//roomcode -> roomdata 
const rooms = new Map<string,RoomData>();
const clients = new Map<WebSocket,{user:string,roomCode:string, sessionId:string, userId?: number | null, isAuthenticated?: boolean}>();

// Initialize Passport
app.use(passport.initialize());

// Create API router with rooms map
const apiRoutes = createApiRouter(rooms);

// Apply API rate limiter to API and file routes
app.use("/api/v1", apiLimiter);
app.use("/api/v1", apiRoutes);
app.use("/files", apiLimiter);

// Health check endpoint 
app.get("/", (req,res)=>{
    res.json({status: "ok", message: "Chat server is running"})
})

app.use("/auth", authRoutes);
app.use("/files", fileRoutes);
app.use("/profile", profileRoutes)

wss.on("connection",(socket, request)=>{
    //user enters here 
    
    socket.on("message",(e)=>{
        let data;
        try{
            data = JSON.parse(e.toString());
            
        }catch(e){
            console.error("JSON ERROR:", e);
            socket.send("Invalid request")
            return;
        }
        if(data.type==="join"){
            const {roomCode,username,sessionId,userId,isAuthenticated,lastMessageTime} = data.payload || {};
           if(!data.payload) {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Missing payload" }
                }));
                return;
            }

            // Validate room code format
            const roomValidation = validateRoomCode(roomCode);
            if (!roomValidation.valid) {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: roomValidation.error }
                }));
                return;
            }

            if(!rooms.has(roomCode)){
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Room closed" }
                }));
                return;
            }

            // Validate username format
            const usernameValidation = validateUsername(username);
            if (!usernameValidation.valid) {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: usernameValidation.error }
                }));
                return;
            }
            if(clients.has(socket)){
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Already joined a room" }
                }));
                return;
            }

            // Use trimmed username after validation
            const validatedUsername = username.trim();

            const roomData = rooms.get(roomCode);
            if(!roomData) return; 
            const {clientsMap} = roomData;
                if(clientsMap.has(sessionId)){
                    //session id exists reconnect flow, back within a minute
                    //1. replace the old socket, 
                    //2. clear timeout on them 
                    const clientInfo = clientsMap.get(sessionId);
                    if(!clientInfo) return;
                    clearTimeout(clientInfo.disconnectTimeout);
                    if(clientInfo.socket)  clientInfo.socket.close();
                    clientInfo.socket = socket;
                    
                }else{
                    //new joining , since session id does nt exists , so ill broadcast to everyone 
                    const allSockets = roomData.clientsMap;
                    const userCount = allSockets.size+1;
                    //maps are getting updated later so temp fix to add 1 
                    for(const cur of allSockets){
                        if(cur[0]!=sessionId){
                            cur[1].socket.send(JSON.stringify({
                                type: "user-joined",
                                payload: { 
                                    user: validatedUsername, 
                                    userCount,
                                    isAuthenticated: isAuthenticated || false
                                }
                            }));
                        }
                    }

                }
                //update both maps here regardless rejoin or join , with new socket which replaces the old one 
                clientsMap.set(sessionId,{
                    socket:socket,
                    user:validatedUsername,
                    sessionId:sessionId,
                    userId: userId || null,
                    isAuthenticated: isAuthenticated || false,
                    lastSeen: Date.now(),
                });
                // Clear empty timestamp when someone joins
                if (clientsMap.size === 1) {
                    roomData.emptyingSince = undefined;
                }
                clients.set(socket,{user:validatedUsername,roomCode,sessionId,userId: userId || null, isAuthenticated: isAuthenticated || false});

                // Track room join statistics for authenticated users
                if (userId) {
                    (async () => {
                        try {
                            const user = await client.user.findUnique({
                                where: { id: userId },
                                select: { lastRoomJoinedCode: true }
                            });
                            
                            // Only increment if this is a new room
                            if (user && user.lastRoomJoinedCode !== roomCode) {
                                await client.user.update({
                                    where: { id: userId },
                                    data: {
                                        totalRoomsJoined: { increment: 1 },
                                        lastRoomJoinedCode: roomCode
                                    }
                                });
                            }
                        } catch (error) {
                            console.error('Error updating room statistics:', error);
                        }
                    })();
                }
                //send msgs now based on the last message time 

                const {messageHistory} = roomData;
                const msgs = messageHistory.filter((m)=> m.time>lastMessageTime);
                socket.send(JSON.stringify({
                    type: "joined",
                    payload: {
                        roomCode,
                        user: validatedUsername,
                        userCount: clientsMap.size,
                        msgs
                    }
                }))
            
        }
        else if(data.type==="message"){
            const client = clients.get(socket);
            if(!client){
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Join a room first" }
                }));
                return;
            }

            // Check WebSocket message rate limit (10 messages per second per session)
            if (!checkWebSocketRateLimit(client.sessionId)) {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Message rate limit exceeded. Maximum 10 messages per second." }
                }));
                return;
            }

            const {msg, fileId, s3Key, s3Url, fileName, fileType, fileSize} = data.payload || {};
            
            // Validate: either msg is present or file metadata is present
            const hasMessage = msg && typeof msg === "string";
            const hasFileData = fileId && s3Key && fileName;
            
            if (!hasMessage && !hasFileData) {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Invalid message: must have text or file data" }
                }));
                return;
            }

            // Validate and sanitize message text if present
            let sanitizedMsg = '';
            if (hasMessage) {
                const sanitization = sanitizeMessage(msg);
                if (sanitization.error) {
                    socket.send(JSON.stringify({
                        type: "error",
                        payload: { message: sanitization.error }
                    }));
                    return;
                }
                sanitizedMsg = sanitization.sanitized;
            }
            
            const {user,roomCode,sessionId,userId,isAuthenticated} = client
            const roomData = rooms.get(roomCode);
            if(!roomData) return ; 
            const time = Date.now();

            const msgObj : Message = {
                msg: sanitizedMsg,
                user,
                time,
                sessionId,
                userId: userId || null,
                isAuthenticated: isAuthenticated || false,
                ...(hasFileData && { fileId, s3Key, s3Url, fileName, fileType, fileSize })
            }
            roomData.messageHistory.push(msgObj);
            if(roomData.messageHistory.length > 100) {
                roomData.messageHistory.shift();
            }
            const sendingData = {type: "message",payload:msgObj} 
            let sockets: Map<string,ClientInfo> = rooms.get(roomCode)!.clientsMap;
            if(!sockets) return;
            for(const cur of sockets){
                cur[1].socket.send(JSON.stringify(sendingData)); 
            }
         }
        
        else if(data.type==="typing"){
            const clientData = clients.get(socket);
            if(!clientData) return;
            const {user,roomCode,sessionId} = clientData
            const roomData = rooms.get(roomCode);
            const roomClients = roomData?.clientsMap;
            if(!roomClients) return;
            for(let cur of roomClients){
                if(cur[1].socket!=socket){
                    cur[1].socket.send(JSON.stringify({
                        type: "typing",
                        payload:{
                            user,
                            sessionId
                        }
                    }))
                }
            }
        }
    })
    socket.on("close",()=>{
        const client = clients.get(socket);
        if(!client) return;
        const {user, roomCode, sessionId} = client;
        const roomData = rooms.get(roomCode);
        if(!roomData) return;
        const clientsMap = roomData.clientsMap;
        const clientData = clientsMap.get(sessionId);
        if(!clientData) return;
        clientData.lastSeen = Date.now();
        //immedialty remove the socket from the clients map as it is dead
        clients.delete(socket);

        function deleteUser(){
            clientsMap.delete(sessionId);
            const roomClients = roomData?.clientsMap;
            if(roomClients && roomClients.size>0){
                for(const cur of roomClients){
                    cur[1].socket.send(JSON.stringify({
                    type:"user-left",
                    payload:{
                        user,
                        userCount:roomClients.size
                    }
                }))
                }
            }
            // Mark room as empty instead of deleting immediately
            if(roomClients?.size === 0){
                if(roomData) roomData.emptyingSince = Date.now();
            }
        }
        const timer = setTimeout(deleteUser,60*1000);
        clientData.disconnectTimeout = timer;
    })
    socket.on("error", (err) => {
    console.error("WS ERROR:", err);
  });
}) 




 