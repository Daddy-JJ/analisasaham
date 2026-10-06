import { getValidAccessToken } from './maxlong-auth';

const MAXLONG_BASE_URL = process.env.MAXLONG_API_BASE_URL || 'https://eod.maxlong.my.id';

export interface MaxlongApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Universal fetcher for Maxlong API with automatic Bearer token injection & refresh
 */
export async function fetchMaxlong<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<MaxlongApiResponse<T>> {
  const token = await getValidAccessToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Token Maxlong belum terhubung. Silakan lakukan otorisasi di menu koneksi.',
    };
  }

  const url = endpoint.startsWith('http') ? endpoint : `${MAXLONG_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        status: res.status,
        error: `Maxlong HTTP ${res.status}: ${errText.slice(0, 250)}`,
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as T;
      return { ok: true, status: res.status, data };
    } else {
      const text = (await res.text()) as unknown as T;
      return { ok: true, status: res.status, data: text };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err.message || 'Gagal menghubungi server Maxlong.',
    };
  }
}

/**
 * Fetch official Screener MaX (Kompas 100 ranking)
 */
export async function fetchScreenerMax() {
  return fetchMaxlong('/api/screener/max');
}

/**
 * Fetch Broksum available dates
 */
export async function fetchBroksumAvailability() {
  return fetchMaxlong('/api/broksum/availability');
}

/**
 * Fetch Broksum summary for a specific ticker
 */
export async function fetchBroksumTickerHistory(ticker: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ ticker });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return fetchMaxlong(`/api/broksum/ticker/history?${params.toString()}`);
}

/**
 * Fetch Bandarmology factors stack for a ticker
 */
export async function fetchBandarmologyFactors(ticker: string) {
  return fetchMaxlong(`/api/bandarmology/ticker/factors?ticker=${encodeURIComponent(ticker)}`);
}

/**
 * Fetch official EOD history from Maxlong
 */
export async function fetchEodHistory(ticker: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ ticker });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  params.set('format', 'json');
  return fetchMaxlong(`/api/eod/history?${params.toString()}`);
}
