import fs from 'fs';
import path from 'path';
import os from 'os';
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

// In-memory cache for fast access & serverless container warm executions
const globalStore = globalThis as unknown as {
  __maxlongTokens?: MaxlongTokens;
  __maxlongClient?: MaxlongClientCredentials;
};

const MAXLONG_BASE_URL = process.env.MAXLONG_API_BASE_URL || 'https://eod.maxlong.my.id';
const RESOURCE_INDICATOR = 'https://eod.maxlong.my.id/mcp';

export function getDefaultRedirectUri(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/auth/maxlong/callback`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/auth/maxlong/callback`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/maxlong/callback`;
  }
  return 'http://localhost:3010/api/auth/maxlong/callback';
}

function getDataDir(): string {
  // In Vercel serverless / AWS lambda, process.cwd() is read-only.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), '.data');
  }
  return path.join(process.cwd(), '.data');
}

function ensureDataDir(): string {
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    // If process.cwd() or dir failed, fallback to os.tmpdir
    const tmpDir = path.join(os.tmpdir(), '.data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // Ignore fallback error
    }
    return tmpDir;
  }
}

function getClientFile(): string {
  return path.join(ensureDataDir(), 'maxlong-client.json');
}

function getTokensFile(): string {
  return path.join(ensureDataDir(), 'maxlong-tokens.json');
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
export async function getClientCredentials(redirectUri?: string): Promise<MaxlongClientCredentials> {
  const targetRedirectUri = redirectUri || getDefaultRedirectUri();

  // 1. Check in-memory store
  if (
    globalStore.__maxlongClient?.client_id &&
    globalStore.__maxlongClient?.client_secret &&
    globalStore.__maxlongClient?.redirect_uris?.includes(targetRedirectUri)
  ) {
    return globalStore.__maxlongClient;
  }

  // 2. Check stored locally on disk
  const clientFile = getClientFile();
  if (fs.existsSync(clientFile)) {
    try {
      const stored = JSON.parse(fs.readFileSync(clientFile, 'utf-8')) as MaxlongClientCredentials;
      if (stored.client_id && stored.client_secret && stored.redirect_uris?.includes(targetRedirectUri)) {
        globalStore.__maxlongClient = stored;
        return stored;
      }
    } catch (e) {
      // ignore parse error, re-register
    }
  }

  // 3. Register dynamically with Maxlong OAuth 2.1 server (RFC 7591)
  const regUrl = `${MAXLONG_BASE_URL}/register`;
  const defaultUri = getDefaultRedirectUri();
  const redirectUris = Array.from(new Set([targetRedirectUri, defaultUri, 'http://localhost:3010/api/auth/maxlong/callback']));

  const res = await fetch(regUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Gemini IDX Pro Next.js',
      redirect_uris: redirectUris,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal registrasi klien OAuth Maxlong: HTTP ${res.status} - ${errorText}`);
  }

  const credentials = (await res.json()) as MaxlongClientCredentials;
  globalStore.__maxlongClient = credentials;
  try {
    fs.writeFileSync(clientFile, JSON.stringify(credentials, null, 2), 'utf-8');
  } catch {
    // ignore if disk write fails on serverless
  }
  return credentials;
}

/**
 * Build authorization URL for user login / consent
 */
export async function createAuthorizationUrl(redirectUri?: string) {
  const targetRedirectUri = redirectUri || getDefaultRedirectUri();
  const client = await getClientCredentials(targetRedirectUri);
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = base64UrlEncode(crypto.randomBytes(16));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: targetRedirectUri,
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
  redirectUri?: string
): Promise<MaxlongTokens> {
  const targetRedirectUri = redirectUri || getDefaultRedirectUri();
  const client = await getClientCredentials(targetRedirectUri);
  const tokenUrl = `${MAXLONG_BASE_URL}/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: targetRedirectUri,
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
 * Save tokens to persistent JSON file and in-memory cache
 */
export function saveTokens(tokens: MaxlongTokens) {
  globalStore.__maxlongTokens = tokens;
  try {
    const file = getTokensFile();
    fs.writeFileSync(file, JSON.stringify(tokens, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Gagal menyimpan token ke disk (in-memory cache aktif):', err);
  }
}

/**
 * Load tokens from in-memory cache or persistent JSON file
 */
export function loadTokens(): MaxlongTokens | null {
  if (globalStore.__maxlongTokens?.access_token) {
    return globalStore.__maxlongTokens;
  }
  try {
    const file = getTokensFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as MaxlongTokens;
      if (data.access_token) {
        globalStore.__maxlongTokens = data;
        return data;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Clear stored tokens
 */
export function clearTokens() {
  globalStore.__maxlongTokens = undefined;
  try {
    const file = getTokensFile();
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch {
    // ignore
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
  redirectUri?: string
): Promise<{ ok: boolean; tokens?: MaxlongTokens; message?: string }> {
  try {
    const targetRedirectUri = redirectUri || getDefaultRedirectUri();
    const client = await getClientCredentials(targetRedirectUri);
    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = base64UrlEncode(crypto.randomBytes(16));

    // 1. Initiate authorization request to get request_id
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: targetRedirectUri,
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
    const tokens = await exchangeAuthorizationCode(code, codeVerifier, targetRedirectUri);
    return { ok: true, tokens };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Terjadi kesalahan saat otorisasi langsung.' };
  }
}
