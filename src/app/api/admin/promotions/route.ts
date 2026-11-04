import { NextResponse } from 'next/server';
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  PromotionStatus,
} from '@/lib/db';

export const runtime = 'nodejs';

export function GET() {
  try {
    const promotions = listPromotions();
    return NextResponse.json(promotions);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors du chargement des promotions.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const {
    product_id,
    name,
    original_price,
    promo_price,
    total_quota,
    start_date,
    end_date,
    status,
    show_remaining,
  } = body as Record<string, unknown>;

  const numProductId = Number(product_id);
  if (!Number.isInteger(numProductId) || numProductId <= 0) {
    return NextResponse.json({ error: 'Identifiant produit invalide.' }, { status: 400 });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Le nom de l\'offre est obligatoire.' }, { status: 400 });
  }

  const numOriginalPrice = Math.round(Number(original_price));
  const numPromoPrice = Math.round(Number(promo_price));
  const numQuota = Math.round(Number(total_quota));

  if (!Number.isFinite(numPromoPrice) || numPromoPrice <= 0) {
    return NextResponse.json({ error: 'Le prix promotionnel doit être un entier positif.' }, { status: 400 });
  }
  if (!Number.isFinite(numOriginalPrice) || numOriginalPrice <= numPromoPrice) {
    return NextResponse.json(
      { error: 'Le prix de référence normal doit être supérieur au prix promotionnel.' },
      { status: 400 }
    );
  }
  if (!Number.isInteger(numQuota) || numQuota <= 0) {
    return NextResponse.json({ error: 'Le quota promotionnel doit être au moins de 1 unité.' }, { status: 400 });
  }

  try {
    const promo = createPromotion({
      product_id: numProductId,
      name: name.trim(),
      original_price: numOriginalPrice,
      promo_price: numPromoPrice,
      total_quota: numQuota,
      start_date: typeof start_date === 'string' && start_date.trim() ? start_date.trim() : null,
      end_date: typeof end_date === 'string' && end_date.trim() ? end_date.trim() : null,
      status: (status as PromotionStatus) || 'active',
      show_remaining: show_remaining !== false && show_remaining !== 0,
    });

    return NextResponse.json(promo, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création de la promotion.' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const {
    id,
    name,
    original_price,
    promo_price,
    total_quota,
    start_date,
    end_date,
    status,
    show_remaining,
  } = body as Record<string, unknown>;

  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: 'Identifiant promotion invalide.' }, { status: 400 });
  }

  try {
    const updated = updatePromotion(numId, {
      name: typeof name === 'string' ? name : undefined,
      original_price: original_price !== undefined ? Math.round(Number(original_price)) : undefined,
      promo_price: promo_price !== undefined ? Math.round(Number(promo_price)) : undefined,
      total_quota: total_quota !== undefined ? Math.round(Number(total_quota)) : undefined,
      start_date: typeof start_date === 'string' ? start_date : start_date === null ? null : undefined,
      end_date: typeof end_date === 'string' ? end_date : end_date === null ? null : undefined,
      status: status as PromotionStatus | undefined,
      show_remaining: show_remaining !== undefined ? !!show_remaining : undefined,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }

  const { id } = (body || {}) as { id?: number };
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }

  try {
    const success = deletePromotion(numId);
    if (!success) {
      return NextResponse.json({ error: 'Promotion introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Promotion supprimée avec succès.' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la suppression.' },
      { status: 500 }
    );
  }
}
