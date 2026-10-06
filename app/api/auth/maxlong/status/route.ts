import { NextRequest, NextResponse } from 'next/server';
import { getMaxlongAuthStatus, directAuthorizeWithAccessKey, clearTokens } from '@/lib/maxlong-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getMaxlongAuthStatus();
  return NextResponse.json({ ok: true, status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessKey } = body;

    if (!accessKey || typeof accessKey !== 'string' || accessKey.trim() === '') {
      return NextResponse.json({ ok: false, message: 'Access Key harus diisi.' }, { status: 400 });
    }

    const origin = request.nextUrl.origin || 'http://localhost:3010';
    const redirectUri = `${origin}/api/auth/maxlong/callback`;

    const result = await directAuthorizeWithAccessKey(accessKey.trim(), redirectUri);

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message || 'Otorisasi gagal.' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Berhasil terhubung ke Maxlong EOD dengan auto-refresh token.',
      status: getMaxlongAuthStatus(),
    });
  } catch (error: any) {
    console.error('Direct auth error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  clearTokens();
  return NextResponse.json({
    ok: true,
    message: 'Koneksi token Maxlong telah diputus.',
    status: getMaxlongAuthStatus(),
  });
}
