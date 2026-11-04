import { NextResponse } from 'next/server';
import { getAllSettings } from '@/lib/db';
import { isTursoEnabled, tursoGetAllSettings } from '@/lib/turso';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const raw = isTursoEnabled() ? await tursoGetAllSettings() : getAllSettings();
    const settings = {
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
    };
    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.warn('[API /api/settings Warning]: Falling back to defaults:', error);
    return NextResponse.json({
      qb_enabled: '1',
      qb_popular_tier: '2',
      qb_tier1_label: '1 Article',
      qb_tier2_label: 'Lot de 2 Articles',
      qb_tier3_label: 'Lot de 3 Articles',
      qb_tier2_subtitle: 'Le Pack Duo Privilège',
      qb_tier3_subtitle: 'Pack Famille & Cadeaux',
      qb_tier2_badge: 'PLUS POPULAIRE',
      qb_tier3_badge: 'MEILLEURE VALEUR',
      qb_template: 'modern',
      qb_accent_color: '#C27835',
    });
  }
}
