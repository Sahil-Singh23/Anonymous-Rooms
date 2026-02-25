import express from "express";
import { WebSocketServer,WebSocket } from "ws";
import cors from 'cors';
import random from "./utils.js";
import * as dotenv from 'dotenv';
dotenv.config();
const PORT = Number(process.env.PORT) || 8000;
const app = express();
app.use(express.json());
app.use(cors());

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
const wss = new WebSocketServer({
    server,
    verifyClient: (info: any) => {

    const origin = info.origin;

    console.log("WebSocket attempt from:", origin);

    // ✅ Allow clients WITHOUT origin (Postman / wscat)
    if (!origin) {
        console.log("✅ No origin → allowing connection");
        return true;
    }

    const allowedOrigins = [
        'https://apichatapp.duckdns.org',
        /.*\.vercel\.app$/,
        'http://localhost:5173'
    ];

    const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
            return allowed === origin;
        }
        return allowed.test(origin);
    });

    if (!isAllowed) {
        console.log("❌ Rejected origin:", origin);
        return false;
    }

    console.log("✅ Accepted origin:", origin);
    return true;
}
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
    console.log(`Deleted empty room: ${roomCode}`);
  }
}, CLEANUP_INTERVAL);

interface Message{
    msg: string,
    user: string,
    time:number,
    sessionId: string,
}
interface RoomData{
    messageHistory: Message[],
    createdAt: number,
    //session id -> their data 
    clientsMap: Map<string,ClientInfo>,
    emptyingSince?: number | undefined  // Timestamp when room became empty
}
interface ClientInfo{
    socket: WebSocket,
    user: string,
    //not really being used as of now, might need in future for last seen feature
    lastSeen: number,
   // lastMessageTime: number,
    disconnectTimeout?: NodeJS.Timeout 
}

//roomcode -> roomdata 
const rooms = new Map<string,RoomData>();
// const rooms = new Map<string,Set<WebSocket>>();
const clients = new Map<WebSocket,{user:string,roomCode:string, sessionId:string}>();

// Health check endpoint for Railway
app.get("/", (req,res)=>{
    res.json({status: "ok", message: "Chat server is running"})
})
app.post("/api/v1/create", (req,res)=>{
    const roomCode = random(6);
    rooms.set(roomCode,{
        messageHistory: [],
        createdAt: Date.now(),
        clientsMap: new Map<string,ClientInfo>()
    });
    res.json({
        roomCode
    })
})
app.post("/api/v1/room/:roomCode",(req,res)=>{
    if(rooms.has(req.params.roomCode))
        return res.json({message:"Valid room"})
    else 
        return res.status(404).json({message:"Invalid room"})
})

wss.on("connection",(socket, request)=>{
    //user enters here 
    console.log("CLIENT CONNECTED from:", request.headers.origin);
    console.log("Headers:", request.headers);
    
    socket.on("message",(e)=>{
        let data;
        console.log("MESSAGE RECEIVED:",e);
        try{
            data = JSON.parse(e.toString());
            console.log("PARSED:", data);
            
        }catch(e){
            console.error("JSON ERROR:", e);
            socket.send("Invalid request")
            return;
        }
        if(data.type==="join"){
            const {roomCode,username,sessionId,lastMessageTime} = data.payload || {};
           if(!data.payload) {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Missing payload" }
                }));
                return;
            }
            if(!roomCode || !rooms.has(roomCode)){
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Room closed" }
                }));

                return;
            }
            if(!username || typeof username !=='string'){
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Invalid username" }
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
            else{
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
                                payload: { user: username, userCount }
                            }));
                        }
                    }

                }
                //update both maps here regardless rejoin or join , with new socket which replaces the old one 
                clientsMap.set(sessionId,{
                    socket:socket,
                    user:username,
                    lastSeen: Date.now(),
                });
                // Clear empty timestamp when someone joins
                if (clientsMap.size === 1) {
                    roomData.emptyingSince = undefined;
                }
                clients.set(socket,{user:username,roomCode,sessionId});
                //send msgs now based on the last message time 

                const {messageHistory} = roomData;
                const msgs = messageHistory.filter((m)=> m.time>lastMessageTime);
                socket.send(JSON.stringify({
                    type: "joined",
                    payload: {
                        roomCode,
                        user: username,
                        userCount: clientsMap.size,
                        msgs
                    }
                }))
            }
            
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
            const {msg} = data.payload || {};
            if (!msg || typeof msg !== "string") {
                socket.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Invalid message" }
                }));
                return;
            }
            const {user,roomCode,sessionId} = client
            const roomData = rooms.get(roomCode);
            if(!roomData) return ; 
            const time = Date.now();

            const msgObj : Message ={
                msg:msg,
                user,
                time,
                sessionId
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




 