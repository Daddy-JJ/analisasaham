import { NextRequest, NextResponse } from 'next/server';
import { runKompas100Screener } from '@/lib/screener-engine';
import { fetchLiveMaxlongScreener } from '@/lib/idx-terminal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 1. Prioritaskan Live MaX V7.30 Screener (mencakup 962 saham BEI dengan algoritma resmi MaX)
    const liveResult = await fetchLiveMaxlongScreener();
    if (liveResult && liveResult.signals.length > 0) {
      return NextResponse.json({
        ok: true,
        source: 'maxlong-live',
        data: liveResult,
      });
    }

    // 2. Fallback aman ke screener lokal Kompas 100 via Yahoo Finance jika live endpoint offline
    const fallbackResult = await runKompas100Screener(force);

    return NextResponse.json({
      ok: true,
      source: 'local-kompas100',
      data: fallbackResult,
    });
  } catch (error: any) {
    console.error('Screener error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || 'Gagal menjalankan screening saham.',
      },
      { status: 500 }
    );
  }
}
