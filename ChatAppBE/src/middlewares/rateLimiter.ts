import rateLimit from "express-rate-limit";
import type { Request } from "express";

// Helper function to extract client IP (handles proxies)
const getClientIp = (req: Request): string => {
  const clientIp = 
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    "unknown";
  return clientIp;
};

// Global rate limiter: 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    status: 429,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === "/";
  },
  keyGenerator: (req) => getClientIp(req),
});

// Auth rate limiter: 5 requests per minute per IP (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  message: {
    status: 429,
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests (both successful and failed)
  keyGenerator: (req) => getClientIp(req),
});

// General API rate limiter: 50 requests per minute per user (or IP if not authenticated)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: {
    status: 429,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use userId if authenticated, otherwise use IP
    const user = req.user as { id?: number; email?: string } | undefined;
    if (user?.id) {
      return `user-${user.id}`;
    }
    return getClientIp(req);
  },
});

// File upload rate limiter: 10 uploads per minute, 500MB per hour per user/IP
interface UploadTracker {
  uploads: number;
  bytesUploadedLastHour: number;
  lastResetTime: number;
  uploadResetTime: number;
}

const uploadTrackers = new Map<string, UploadTracker>();

const UPLOAD_LIMIT_PER_MINUTE = 10;
const BANDWIDTH_LIMIT_PER_HOUR = 500 * 1024 * 1024; // 500MB

export const fileUploadLimiter = (req: Request, res: any, next: any) => {
  const user = req.user as { id?: number; email?: string } | undefined;
  const key = user?.id ? `user-${user.id}` : getClientIp(req);
  
  const now = Date.now();
  let tracker = uploadTrackers.get(key);

  // Initialize or reset tracker if needed
  if (!tracker) {
    tracker = {
      uploads: 0,
      bytesUploadedLastHour: 0,
      lastResetTime: now,
      uploadResetTime: now,
    };
    uploadTrackers.set(key, tracker);
  }

  // Reset uploads counter every minute
  if (now - tracker.uploadResetTime > 60 * 1000) {
    tracker.uploads = 0;
    tracker.uploadResetTime = now;
  }

  // Reset bandwidth counter every hour
  if (now - tracker.lastResetTime > 60 * 60 * 1000) {
    tracker.bytesUploadedLastHour = 0;
    tracker.lastResetTime = now;
  }

  // Check upload rate limit
  if (tracker.uploads >= UPLOAD_LIMIT_PER_MINUTE) {
    return res.status(429).json({
      error: "Too many upload requests. Maximum 10 uploads per minute.",
    });
  }

  // Get file size from request body or header
  const filesize = req.body?.filesize || 0;

  // Check bandwidth limit
  if (tracker.bytesUploadedLastHour + filesize > BANDWIDTH_LIMIT_PER_HOUR) {
    const remainingBytes = BANDWIDTH_LIMIT_PER_HOUR - tracker.bytesUploadedLastHour;
    const remainingMB = Math.ceil(remainingBytes / (1024 * 1024));
    return res.status(429).json({
      error: `Bandwidth limit exceeded. You have ${remainingMB}MB remaining for this hour.`,
    });
  }

  // Increment counters
  tracker.uploads++;
  tracker.bytesUploadedLastHour += filesize;

  // Store tracking info on request for logging
  (req as any).uploadTracker = {
    key,
    uploads: tracker.uploads,
    bytesUploadedLastHour: tracker.bytesUploadedLastHour,
  };

  next();
};

// WebSocket message rate limiter: 10 messages per second per session
interface WebSocketRateLimiter {
  messageCount: number;
  windowStart: number;
}

const wsRateLimiters = new Map<string, WebSocketRateLimiter>();

const WS_MESSAGES_PER_SECOND = 10;
const WS_WINDOW_MS = 1000; // 1 second

/**
 * Check if a WebSocket session has exceeded message rate limit
 * @param sessionId - Unique session identifier
 * @returns true if within limit, false if exceeded
 */
export function checkWebSocketRateLimit(sessionId: string): boolean {
  const now = Date.now();
  let limiter = wsRateLimiters.get(sessionId);

  // Initialize or reset if window expired
  if (!limiter) {
    wsRateLimiters.set(sessionId, {
      messageCount: 1,
      windowStart: now,
    });
    return true;
  }

  // Reset window if time has passed
  if (now - limiter.windowStart > WS_WINDOW_MS) {
    limiter.messageCount = 1;
    limiter.windowStart = now;
    return true;
  }

  // Check limit
  if (limiter.messageCount >= WS_MESSAGES_PER_SECOND) {
    return false;
  }

  // Increment and allow
  limiter.messageCount++;
  return true;
}

/**
 * Clean up old rate limiters to prevent memory leaks
 * Call this periodically (e.g., every 10 minutes)
 */
export function cleanupWebSocketRateLimiters(): void {
  const now = Date.now();
  const timeout = 10 * 60 * 1000; // 10 minutes

  for (const [sessionId, limiter] of wsRateLimiters.entries()) {
    if (now - limiter.windowStart > timeout) {
      wsRateLimiters.delete(sessionId);
    }
  }
}
