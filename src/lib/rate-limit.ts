type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// Stockage en mémoire des compteurs de rate limit
const ipLimitStore = new Map<string, RateLimitRecord>();

/**
 * Nettoie périodiquement les entrées expirées du cache
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of ipLimitStore.entries()) {
    if (value.resetAt < now) {
      ipLimitStore.delete(key);
    }
  }
}

// Nettoyage toutes les 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000).unref?.();

/**
 * Vérifie et incrémente le quota pour une clé donnée (IP + action)
 * @returns { success: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = ipLimitStore.get(key);

  if (!record || record.resetAt < now) {
    ipLimitStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      success: true,
      remaining: maxAttempts - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (record.count >= maxAttempts) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    success: true,
    remaining: maxAttempts - record.count,
    resetInSeconds,
  };
}

export function resetRateLimit(key: string) {
  ipLimitStore.delete(key);
}

/**
 * Récupère l'IP du client depuis les en-têtes HTTP de la requête
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
