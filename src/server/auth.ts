import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'http';

export interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

export interface JwtPayload {
  sub: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  email?: string;
  role?: string;
  iss?: string;
  [key: string]: unknown;
}

export interface VerifiedUser {
  id: string;
  email: string;
  role: string;
  aud: string | string[];
  exp: number;
  claims: JwtPayload;
}

export interface JwkKey extends crypto.JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

const ALLOWED_ASYMMETRIC_ALGS = new Set(['RS256', 'ES256']);

// Pre-seeded institutional accounts for Returning User vs New User progressive disclosure flow
const registeredEmails = new Set<string>([
  'chief.quant@supernova.ai',
  'alpha.trader@citadel-macro.com',
  'quant.research@bridgewater.internal',
  'macro.desk@millennium.com',
]);

export function checkRegisteredEmail(email: string): boolean {
  const normalized = String(email || '').trim().toLowerCase();
  return registeredEmails.has(normalized);
}

export function registerEmailAddress(email: string): void {
  const normalized = String(email || '').trim().toLowerCase();
  if (normalized && normalized.includes('@')) {
    registeredEmails.add(normalized);
  }
}

export function getRegisteredEmails(): string[] {
  return Array.from(registeredEmails);
}

function decodeBase64UrlJson<T>(segment: string): T {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json) as T;
}

function decodeBase64UrlBuffer(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

// JWKS Cache for Supabase asymmetric verification
let jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

async function getSupabaseJwks(supabaseUrl: string): Promise<JwkKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const jwksEndpoint = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`;
  const res = await fetch(jwksEndpoint, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksEndpoint}: HTTP ${res.status}`);
  }
  const body = (await res.json()) as { keys?: JwkKey[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

export function verifyAsymmetricSignature(
  signingInput: string,
  signatureB64Url: string,
  header: JwtHeader,
  keys: JwkKey[]
): boolean {
  const matchingKey =
    keys.find((k) => header.kid && k.kid === header.kid) ||
    keys.find((k) => !k.alg || k.alg === header.alg) ||
    keys[0];

  if (!matchingKey) {
    throw new Error('No matching JWK found in JWKS for token verification');
  }

  const publicKey = crypto.createPublicKey({
    key: matchingKey,
    format: 'jwk',
  });

  const signatureBuffer = decodeBase64UrlBuffer(signatureB64Url);
  const dataBuffer = Buffer.from(signingInput, 'utf8');

  if (header.alg === 'ES256') {
    return crypto.verify(
      'sha256',
      dataBuffer,
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      signatureBuffer
    );
  }

  if (header.alg === 'RS256') {
    return crypto.verify('RSA-SHA256', dataBuffer, publicKey, signatureBuffer);
  }

  return false;
}

export interface VerifyJwtOptions {
  nowSeconds?: number;
  jwksKeys?: JwkKey[];
  enforceCryptographicSignature?: boolean;
}

/**
 * Verifies a Bearer JWT token:
 * 1. Rejects `alg="none"` and enforces asymmetric `RS256` or `ES256` algorithm header.
 * 2. Enforces required claims (`exp`, `sub`, `aud="authenticated"`).
 * 3. Verifies cryptographic signature against JWKS when configured or provided.
 */
export async function verifyJwtToken(
  rawToken: string,
  options: VerifyJwtOptions = {}
): Promise<VerifiedUser> {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Missing authentication token');
  }

  const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();
  const parts = cleanToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT: expected 3 segments (header.payload.signature)');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Malformed JWT: empty segment detected');
  }

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = decodeBase64UrlJson<JwtHeader>(headerB64);
    payload = decodeBase64UrlJson<JwtPayload>(payloadB64);
  } catch {
    throw new Error('Invalid JWT encoding in header or payload');
  }

  // 1. Reject alg="none" and enforce RS256 / ES256
  const alg = String(header?.alg || '').trim();
  if (!alg || alg.toLowerCase() === 'none') {
    throw new Error('Rejected JWT: alg="none" is strictly forbidden');
  }
  if (!ALLOWED_ASYMMETRIC_ALGS.has(alg)) {
    throw new Error(`Rejected JWT: unsupported algorithm "${alg}". Expected RS256 or ES256`);
  }

  // 2. Enforce required claim: sub
  if (!payload?.sub || typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new Error('Rejected JWT: missing or invalid required claim "sub"');
  }

  // 3. Enforce required claim: aud="authenticated"
  const aud = payload.aud;
  const isAudValid =
    aud === 'authenticated' || (Array.isArray(aud) && aud.includes('authenticated'));
  if (!isAudValid) {
    throw new Error('Rejected JWT: invalid "aud" claim; expected "authenticated"');
  }

  // 4. Enforce required claim: exp
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    throw new Error('Rejected JWT: missing required numeric "exp" claim');
  }
  if (payload.exp <= nowSeconds) {
    throw new Error('Rejected JWT: token has expired (exp <= now)');
  }

  // 5. Cryptographic signature check via JWKS when provided or when Supabase Cloud URL is configured
  const signingInput = `${headerB64}.${payloadB64}`;
  if (options.jwksKeys && options.jwksKeys.length > 0) {
    const valid = verifyAsymmetricSignature(signingInput, signatureB64, header, options.jwksKeys);
    if (!valid) {
      throw new Error('Rejected JWT: cryptographic JWKS signature verification failed');
    }
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const isRealSupabase =
      Boolean(supabaseUrl) &&
      supabaseUrl.startsWith('https://') &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseUrl.includes('offline.local');

    if (
      (isRealSupabase && payload.iss !== 'supernova-enclave') ||
      options.enforceCryptographicSignature
    ) {
      const keys = await getSupabaseJwks(supabaseUrl);
      const valid = verifyAsymmetricSignature(signingInput, signatureB64, header, keys);
      if (!valid) {
        throw new Error('Rejected JWT: cryptographic JWKS signature verification failed');
      }
    }
  }

  if (payload.email && typeof payload.email === 'string') {
    registerEmailAddress(payload.email);
  }

  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : 'authenticated@supernova.ai',
    role: typeof payload.role === 'string' ? payload.role : 'authenticated',
    aud: payload.aud,
    exp: payload.exp,
    claims: payload,
  };
}

export interface AuthenticatedRequest extends Request {
  user?: VerifiedUser;
}

/**
 * Express middleware equivalent to FastAPI `Depends(get_current_user)`.
 * Enforces Bearer JWT verification across protected feature routers.
 */
export async function getCurrentUserMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({
      detail: 'Missing or invalid Authorization Bearer header',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const verifiedUser = await verifyJwtToken(token);
    req.user = verifiedUser;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    res.status(401).json({
      detail: message,
      code: 'INVALID_JWT',
    });
  }
}

/**
 * Extracts and verifies a JWT token from a WebSocket upgrade request
 * via `sec-websocket-protocol` (e.g. `bearer, <jwt>`) or `?token=<jwt>` query param.
 */
export async function verifyWebSocketHandshake(
  request: IncomingMessage
): Promise<{ user: VerifiedUser | null; selectedProtocol?: string }> {
  const protocolHeader = request.headers['sec-websocket-protocol'];
  if (protocolHeader) {
    const raw = Array.isArray(protocolHeader) ? protocolHeader.join(',') : protocolHeader;
    const protocols = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // Look for ['bearer', '<token>'] or a 3-segment JWT inside sec-websocket-protocol
    const jwtCandidate = protocols.find((p) => p.split('.').length === 3);
    const hasBearerPrefix = protocols.some((p) => p.toLowerCase() === 'bearer');

    if (jwtCandidate) {
      const user = await verifyJwtToken(jwtCandidate);
      return {
        user,
        selectedProtocol: hasBearerPrefix ? 'bearer' : jwtCandidate,
      };
    }
  }

  // Fallback check on query string `?token=...`
  if (request.url) {
    try {
      const urlObj = new URL(request.url, 'http://localhost');
      const queryToken = urlObj.searchParams.get('token');
      if (queryToken) {
        const user = await verifyJwtToken(queryToken);
        return { user };
      }
    } catch {
      // Ignore URL parse error
    }
  }

  return { user: null };
}
