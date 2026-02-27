// Simple in-memory rate limiter for edge functions
// Tracks requests per user with a sliding window
// Note: Each edge function isolate has its own state, so this is per-instance

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
function cleanup(windowMs: number) {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Check if a request should be rate-limited.
 * @param userId - The user's ID
 * @param featureName - Name of the AI feature (e.g., "vault-pal-chat")
 * @param maxRequests - Maximum requests allowed in the window (default: 30)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns { allowed: boolean, remaining: number, retryAfterMs?: number }
 */
export function checkRateLimit(
  userId: string,
  featureName: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const key = `${userId}:${featureName}`;
  const now = Date.now();

  // Periodic cleanup every 100 checks
  if (Math.random() < 0.01) cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: maxRequests - entry.timestamps.length };
}

/**
 * Returns a 429 Response if rate-limited, or null if allowed.
 */
export function rateLimitResponse(
  userId: string,
  featureName: string,
  corsHeaders: Record<string, string>,
  maxRequests = 30,
  windowMs = 60_000
): Response | null {
  const result = checkRateLimit(userId, featureName, maxRequests, windowMs);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.retryAfterMs || windowMs) / 1000);
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Please try again shortly.",
        retryAfterSeconds: retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  return null;
}
