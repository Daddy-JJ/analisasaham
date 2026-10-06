import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthorizationCode } from '@/lib/maxlong-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin || 'http://localhost:3010';
  const redirectUri = `${origin}/api/auth/maxlong/callback`;

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error_description') || request.nextUrl.searchParams.get('error');

  if (error) {
    const targetUrl = new URL('/', origin);
    targetUrl.searchParams.set('auth_error', encodeURIComponent(error));
    return NextResponse.redirect(targetUrl.toString());
  }

  if (!code) {
    const targetUrl = new URL('/', origin);
    targetUrl.searchParams.set('auth_error', 'Kode otorisasi tidak ditemukan.');
    return NextResponse.redirect(targetUrl.toString());
  }

  // Verify PKCE code_verifier and CSRF state
  const codeVerifier = request.cookies.get('maxlong_code_verifier')?.value;
  const storedState = request.cookies.get('maxlong_oauth_state')?.value;

  if (!codeVerifier || !storedState || storedState !== state) {
    const targetUrl = new URL('/', origin);
    targetUrl.searchParams.set('auth_error', 'Sesi otorisasi kedaluwarsa atau state CSRF tidak cocok.');
    return NextResponse.redirect(targetUrl.toString());
  }

  try {
    await exchangeAuthorizationCode(code, codeVerifier, redirectUri);

    const targetUrl = new URL('/', origin);
    targetUrl.searchParams.set('auth', 'maxlong_connected');

    const response = NextResponse.redirect(targetUrl.toString());
    // Clear temporary cookies
    response.cookies.delete('maxlong_code_verifier');
    response.cookies.delete('maxlong_oauth_state');

    return response;
  } catch (err: any) {
    console.error('Callback token exchange error:', err);
    const targetUrl = new URL('/', origin);
    targetUrl.searchParams.set('auth_error', encodeURIComponent(err.message || 'Gagal menukar token otorisasi.'));
    return NextResponse.redirect(targetUrl.toString());
  }
}
