/**
 * Auth — Phase 1 MVP
 *
 * Simple API key validation. No JWT, no OAuth yet.
 * API keys are configured via RELAY_API_KEYS env var (comma-separated).
 *
 * Phase 2 will add GitHub OAuth + JWT.
 */

/** Parse configured API keys from environment */
function getApiKeys(): Set<string> {
  const keys = process.env.RELAY_API_KEYS;
  if (!keys) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RELAY_API_KEYS env var is required in production. Set comma-separated API keys.');
    }
    console.warn('[auth] RELAY_API_KEYS not set — generating ephemeral dev key. Do NOT use in production.');
    const devKey = `aios_dev_${Date.now().toString(36)}`;
    console.warn(`[auth] Dev API key: ${devKey}`);
    return new Set([devKey]);
  }
  return new Set(keys.split(',').map((k) => k.trim()).filter(Boolean));
}

const validKeys = getApiKeys();

/** Validate an API key, returns a user ID derived from the key */
export function validateApiKey(key: string): { valid: boolean; userId: string } {
  if (validKeys.has(key)) {
    // Derive a stable user ID from the key (Phase 1: simple hash)
    const userId = `user_${simpleHash(key)}`;
    return { valid: true, userId };
  }
  return { valid: false, userId: '' };
}

/** Extract API key from request (query param or header) */
export function extractApiKey(req: Request): string | null {
  const url = new URL(req.url);

  // Query param: ?token=xxx
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) return tokenParam;

  // Header: Authorization: Bearer xxx
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  // Header: X-API-Key: xxx
  const apiKey = req.headers.get('X-API-Key');
  if (apiKey) return apiKey;

  return null;
}

/** Auth middleware — validates request and returns userId */
export function authenticateRequest(req: Request): { authenticated: boolean; userId: string } {
  const key = extractApiKey(req);
  if (!key) return { authenticated: false, userId: '' };
  return { authenticated: true, ...validateApiKey(key) };
}

/** Simple hash for deriving user ID from API key */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
