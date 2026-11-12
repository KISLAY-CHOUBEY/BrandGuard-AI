// Simple in-memory rate limiter for /api/gemini endpoint
// Used by both dev-server.mjs (Express) and api/gemini.ts (Vercel serverless function)

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  timeFn?: () => number; // Optional time function for testing
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitInfo>();

/** Reset the rate limit store (for testing only) */
export function __resetRateLimitStore(): void {
  rateLimitStore.clear();
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message, timeFn = Date.now } = config;

  const cleanupInterval = setInterval(() => {
    const now = timeFn();
    for (const [key, info] of rateLimitStore.entries()) {
      if (info.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  const cleanup = () => clearInterval(cleanupInterval);

  return {
    check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
      const now = timeFn();
      const existing = rateLimitStore.get(key);

      if (!existing || existing.resetTime < now) {
        const resetTime = now + windowMs;
        rateLimitStore.set(key, { count: 1, resetTime });
        return { allowed: true, remaining: maxRequests - 1, resetTime };
      }

      if (existing.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: existing.resetTime };
      }

      existing.count++;
      return { allowed: true, remaining: maxRequests - existing.count, resetTime: existing.resetTime };
    },

    getInfo(key: string): { remaining: number; resetTime: number } | null {
      const existing = rateLimitStore.get(key);
      if (!existing || existing.resetTime < timeFn()) {
        return null;
      }
      return { remaining: Math.max(0, maxRequests - existing.count), resetTime: existing.resetTime };
    },

    cleanup,
  };
}

export const geminiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many requests. Please wait a moment before trying again.',
});

export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

export function setRateLimitHeaders(res: any, info: { remaining: number; resetTime: number } | null, maxRequests: number) {
  if (!info) return;
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', info.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));
}