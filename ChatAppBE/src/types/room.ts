import type { WebSocket } from "ws";

export interface Message {
  msg: string;
  user: string;
  time: number;
  sessionId: string;
  userId?: number | null;
  isAuthenticated?: boolean;
  fileId?: number;
  s3Key?: string;
  s3Url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface ClientInfo {
  socket: WebSocket;
  user: string;
  sessionId: string;
  userId?: number | null;
  isAuthenticated?: boolean;
  lastSeen: number;
  disconnectTimeout?: NodeJS.Timeout;
}

export interface RoomData {
  messageHistory: Message[];
  createdAt: number;
  clientsMap: Map<string, ClientInfo>;
  emptyingSince?: number | undefined;
}
