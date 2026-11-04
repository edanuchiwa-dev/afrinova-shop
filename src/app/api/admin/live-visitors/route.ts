import { NextResponse } from 'next/server';
import { getLiveVisitorsData } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = getLiveVisitorsData(3);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Erreur API admin live visitors:', err);
    return NextResponse.json({ error: 'Erreur récupération direct' }, { status: 500 });
  }
}
