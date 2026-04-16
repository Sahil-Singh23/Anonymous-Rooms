import rateLimit from "express-rate-limit";

// Global rate limiter: 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    status: 429,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in 'RateLimit-*' headers
  legacyHeaders: false, // Disable 'X-RateLimit-*' headers
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/";
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind a proxy, otherwise use req.ip
    const clientIp = 
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      "unknown";
    return clientIp;
  },
});
