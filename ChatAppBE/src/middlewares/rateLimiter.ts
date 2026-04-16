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
