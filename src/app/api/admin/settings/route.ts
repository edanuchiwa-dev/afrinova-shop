import { NextResponse } from 'next/server';
import { getAllSettings, setSetting } from '@/lib/db';

export const runtime = 'nodejs';

export function GET() {
  try {
    const raw = getAllSettings();
    return NextResponse.json({
      qb_enabled: raw.qb_enabled ?? '1',
      qb_popular_tier: raw.qb_popular_tier ?? '2',
      qb_tier1_label: raw.qb_tier1_label ?? '1 Article',
      qb_tier2_label: raw.qb_tier2_label ?? 'Lot de 2 Articles',
      qb_tier3_label: raw.qb_tier3_label ?? 'Lot de 3 Articles',
      qb_tier2_subtitle: raw.qb_tier2_subtitle ?? 'Le Pack Duo Privilège',
      qb_tier3_subtitle: raw.qb_tier3_subtitle ?? 'Pack Famille & Cadeaux',
      qb_tier2_badge: raw.qb_tier2_badge ?? 'PLUS POPULAIRE',
      qb_tier3_badge: raw.qb_tier3_badge ?? 'MEILLEURE VALEUR',
      qb_template: raw.qb_template ?? 'modern',
      qb_accent_color: raw.qb_accent_color ?? '#C27835',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la récupération des paramètres.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
    }

    const allowedKeys = [
      'qb_enabled',
      'qb_popular_tier',
      'qb_tier1_label',
      'qb_tier2_label',
      'qb_tier3_label',
      'qb_tier2_subtitle',
      'qb_tier3_subtitle',
      'qb_tier2_badge',
      'qb_tier3_badge',
      'qb_template',
      'qb_accent_color',
    ];

    for (const key of allowedKeys) {
      if (key in body && typeof body[key] === 'string') {
        setSetting(key, body[key]);
      }
    }

    const updated = getAllSettings();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour des paramètres.' },
      { status: 500 }
    );
  }
}
