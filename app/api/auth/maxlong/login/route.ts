import { NextRequest, NextResponse } from 'next/server';
import { createAuthorizationUrl } from '@/lib/maxlong-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin || 'http://localhost:3010';
    const redirectUri = `${origin}/api/auth/maxlong/callback`;

    const { authUrl, codeVerifier, state } = await createAuthorizationUrl(redirectUri);

    const response = NextResponse.redirect(authUrl);

    // Save PKCE verifier & state in HTTP-only cookies (valid for 15 minutes)
    response.cookies.set('maxlong_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 900,
      path: '/',
    });

    response.cookies.set('maxlong_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 900,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login initiation error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'Gagal memulai otorisasi Maxlong.' },
      { status: 500 }
    );
  }
}
