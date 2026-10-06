import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface MaxlongClientCredentials {
  client_id: string;
  client_secret: string;
  client_name: string;
  redirect_uris: string[];
  client_secret_expires_at?: number;
  client_id_issued_at?: number;
}

export interface MaxlongTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at: number; // Unix timestamp in seconds
  scope?: string;
  saved_at: number;
}

export interface MaxlongAuthStatus {
  connected: boolean;
  type: 'oauth' | 'static_key' | 'disconnected';
  expiresAt?: number;
  expiresInSeconds?: number;
  scope?: string;
  hasRefreshToken?: boolean;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const CLIENT_FILE = path.join(DATA_DIR, 'maxlong-client.json');
const TOKENS_FILE = path.join(DATA_DIR, 'maxlong-tokens.json');

const MAXLONG_BASE_URL = process.env.MAXLONG_API_BASE_URL || 'https://eod.maxlong.my.id';
const RESOURCE_INDICATOR = 'https://eod.maxlong.my.id/mcp';
const DEFAULT_REDIRECT_URI = 'http://localhost:3010/api/auth/maxlong/callback';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Base64-URL encode without padding
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate PKCE pair (code_verifier and code_challenge S256)
 */
export function generatePkcePair() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

/**
 * Retrieve cached Dynamic Client Registration credentials or register automatically
 */
export async function getClientCredentials(redirectUri: string = DEFAULT_REDIRECT_URI): Promise<MaxlongClientCredentials> {
  ensureDataDir();

  // 1. Check if stored locally
  if (fs.existsSync(CLIENT_FILE)) {
    try {
      const stored = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf-8')) as MaxlongClientCredentials;
      if (stored.client_id && stored.client_secret && stored.redirect_uris?.includes(redirectUri)) {
        return stored;
      }
    } catch (e) {
      // ignore parse error, re-register
    }
  }

  // 2. Register dynamically with Maxlong OAuth 2.1 server (RFC 7591)
  const regUrl = `${MAXLONG_BASE_URL}/register`;
  const res = await fetch(regUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Gemini IDX Pro Next.js',
      redirect_uris: [redirectUri, DEFAULT_REDIRECT_URI],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal registrasi klien OAuth Maxlong: HTTP ${res.status} - ${errorText}`);
  }

  const credentials = (await res.json()) as MaxlongClientCredentials;
  fs.writeFileSync(CLIENT_FILE, JSON.stringify(credentials, null, 2), 'utf-8');
  return credentials;
}

/**
 * Build authorization URL for user login / consent
 */
export async function createAuthorizationUrl(redirectUri: string = DEFAULT_REDIRECT_URI) {
  const client = await getClientCredentials(redirectUri);
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = base64UrlEncode(crypto.randomBytes(16));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: redirectUri,
    scope: 'mcp:tools',
    resource: RESOURCE_INDICATOR,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${MAXLONG_BASE_URL}/authorize?${params.toString()}`;
  return { authUrl, codeVerifier, state };
}

/**
 * Exchange authorization code for access_token and refresh_token
 */
export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  redirectUri: string = DEFAULT_REDIRECT_URI
): Promise<MaxlongTokens> {
  const client = await getClientCredentials(redirectUri);
  const tokenUrl = `${MAXLONG_BASE_URL}/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: client.client_id,
    client_secret: client.client_secret,
    code_verifier: codeVerifier,
    resource: RESOURCE_INDICATOR,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal menukar authorization code dengan token: HTTP ${res.status} - ${errText}`);
  }

  const raw = await res.json();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = raw.expires_in || 3600;

  const tokens: MaxlongTokens = {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    token_type: raw.token_type || 'Bearer',
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    scope: raw.scope,
    saved_at: now,
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Refresh an expired access_token using refresh_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<MaxlongTokens> {
  const client = await getClientCredentials();
  const tokenUrl = `${MAXLONG_BASE_URL}/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: client.client_id,
    client_secret: client.client_secret,
    resource: RESOURCE_INDICATOR,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal refresh token Maxlong: HTTP ${res.status} - ${errText}`);
  }

  const raw = await res.json();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = raw.expires_in || 3600;

  const tokens: MaxlongTokens = {
    access_token: raw.access_token,
    // Preserve old refresh token if server did not rotate it
    refresh_token: raw.refresh_token || refreshToken,
    token_type: raw.token_type || 'Bearer',
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    scope: raw.scope,
    saved_at: now,
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Save tokens to persistent JSON file
 */
export function saveTokens(tokens: MaxlongTokens) {
  ensureDataDir();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

/**
 * Load tokens from persistent JSON file
 */
export function loadTokens(): MaxlongTokens | null {
  if (!fs.existsSync(TOKENS_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8')) as MaxlongTokens;
    if (data.access_token) return data;
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Clear stored tokens
 */
export function clearTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    try {
      fs.unlinkSync(TOKENS_FILE);
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Get a guaranteed-valid Access Token, auto-refreshing in background if needed
 */
export async function getValidAccessToken(): Promise<string | null> {
  // 1. Static API Key override in environment variables
  if (process.env.MAXLONG_API_KEY && process.env.MAXLONG_API_KEY.trim() !== '') {
    return process.env.MAXLONG_API_KEY.trim();
  }

  // 2. Load OAuth tokens
  const tokens = loadTokens();
  if (!tokens || !tokens.access_token) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  // Buffer of 60 seconds to refresh before actual expiration
  if (tokens.expires_at - 60 > now) {
    return tokens.access_token;
  }

  // 3. Token is expired or expiring soon, try auto-refresh
  if (tokens.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      return refreshed.access_token;
    } catch (err: any) {
      console.warn('Gagal auto-refresh access token Maxlong:', err.message);
      return null;
    }
  }

  return null;
}

/**
 * Get current Maxlong connection status
 */
export function getMaxlongAuthStatus(): MaxlongAuthStatus {
  if (process.env.MAXLONG_API_KEY && process.env.MAXLONG_API_KEY.trim() !== '') {
    return {
      connected: true,
      type: 'static_key',
    };
  }

  const tokens = loadTokens();
  if (!tokens || !tokens.access_token) {
    return {
      connected: false,
      type: 'disconnected',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = tokens.expires_at <= now;

  return {
    connected: !isExpired || !!tokens.refresh_token,
    type: 'oauth',
    expiresAt: tokens.expires_at,
    expiresInSeconds: Math.max(0, tokens.expires_at - now),
    scope: tokens.scope,
    hasRefreshToken: !!tokens.refresh_token,
  };
}

/**
 * Direct in-app authorization using user-provided Access Key
 * Automates: /authorize -> /oauth/approve -> /token
 */
export async function directAuthorizeWithAccessKey(
  accessKey: string,
  redirectUri: string = DEFAULT_REDIRECT_URI
): Promise<{ ok: boolean; tokens?: MaxlongTokens; message?: string }> {
  try {
    const client = await getClientCredentials(redirectUri);
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = base64UrlEncode(crypto.randomBytes(16));

    // 1. Initiate authorization request to get request_id
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: redirectUri,
      scope: 'mcp:tools',
      resource: RESOURCE_INDICATOR,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    const authRes = await fetch(`${MAXLONG_BASE_URL}/authorize?${authParams.toString()}`);
    if (!authRes.ok) {
      return { ok: false, message: `Gagal mengakses authorization endpoint: HTTP ${authRes.status}` };
    }

    const authHtml = await authRes.text();
    const match = authHtml.match(/name="request_id" value="([^"]+)"/);
    if (!match || !match[1]) {
      return { ok: false, message: 'Tidak dapat menemukan request_id pada form persetujuan Maxlong.' };
    }

    const requestId = match[1];

    // 2. Submit access key to /oauth/approve
    const approveRes = await fetch(`${MAXLONG_BASE_URL}/oauth/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        request_id: requestId,
        access_key: accessKey.trim(),
      }).toString(),
      redirect: 'manual',
    });

    // Valid approval returns 302 redirect with Location containing ?code=
    const location = approveRes.headers.get('location');
    if (!location) {
      const body = await approveRes.text();
      if (body.includes('Invalid access key')) {
        return { ok: false, message: 'Access Key salah atau tidak valid di server Maxlong.' };
      }
      return { ok: false, message: `Approval gagal tanpa redirect (HTTP ${approveRes.status}).` };
    }

    const redirectUrl = new URL(location, 'http://localhost');
    const code = redirectUrl.searchParams.get('code');
    const returnedState = redirectUrl.searchParams.get('state');

    if (!code) {
      const err = redirectUrl.searchParams.get('error_description') || redirectUrl.searchParams.get('error') || 'Tidak ada kode otorisasi.';
      return { ok: false, message: `Otorisasi ditolak: ${err}` };
    }

    if (returnedState !== state) {
      return { ok: false, message: 'State mismatch / verifikasi CSRF gagal.' };
    }

    // 3. Exchange code for access & refresh tokens
    const tokens = await exchangeAuthorizationCode(code, codeVerifier, redirectUri);
    return { ok: true, tokens };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Terjadi kesalahan saat otorisasi langsung.' };
  }
}
