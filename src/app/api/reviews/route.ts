import { NextRequest, NextResponse } from 'next/server';
import { getApprovedReviews, getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawProductId = searchParams.get('productId');
  const productId = rawProductId ? Number(rawProductId) : undefined;

  try {
    const reviews = getApprovedReviews(Number.isFinite(productId) ? productId : undefined);
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, rating, customerName, city, comment } = body;

    if (!customerName || !comment) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const validProductId = productId ? Number(productId) : null;

    const db = getDb();
    db.prepare(`
      INSERT INTO reviews (product_id, rating, customer_name, city, comment, status)
      VALUES (?, ?, ?, ?, ?, 'approuve')
    `).run(
      validProductId,
      numRating,
      String(customerName).trim().slice(0, 80),
      String(city || 'Cotonou').trim().slice(0, 50),
      String(comment).trim().slice(0, 500)
    );

    return NextResponse.json({
      success: true,
      message: 'Votre avis a été enregistré avec succès.',
    });
  } catch {
    return NextResponse.json({ error: 'Impossible d’enregistrer votre avis pour le moment.' }, { status: 500 });
  }
}
