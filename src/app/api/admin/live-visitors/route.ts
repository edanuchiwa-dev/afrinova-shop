import { NextRequest, NextResponse } from 'next/server';
import { getLiveVisitorsData } from '@/lib/db';
import { isTursoEnabled, tursoGetLiveVisitorsData } from '@/lib/turso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const windowMinutes = Math.max(1, Math.min(60, Number(searchParams.get('window')) || 3));

    let data;
    if (isTursoEnabled()) {
      data = await tursoGetLiveVisitorsData(windowMinutes);
    } else {
      data = getLiveVisitorsData(windowMinutes);
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err) {
    console.error('Erreur API admin live visitors:', err);
    return NextResponse.json({ error: 'Erreur récupération direct' }, { status: 500 });
  }
}
