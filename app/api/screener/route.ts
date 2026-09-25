import { NextRequest, NextResponse } from 'next/server';
import { runKompas100Screener } from '@/lib/screener-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const result = await runKompas100Screener(force);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Screener error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || 'Gagal menjalankan screening Kompas 100.',
      },
      { status: 500 }
    );
  }
}
