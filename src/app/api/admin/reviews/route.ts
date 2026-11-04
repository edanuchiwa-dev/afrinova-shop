import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export function GET() {
  const db = getDb();
  const reviews = db.prepare(`
    SELECT r.*, p.name as product_name
    FROM reviews r
    LEFT JOIN products p ON r.product_id = p.id
    ORDER BY r.id DESC
  `).all();
  return NextResponse.json({ reviews });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const { id, status } = body as Record<string, unknown>;

  if (!Number.isSafeInteger(id) || !['approuve', 'rejete', 'en_attente'].includes(status as string)) {
    return NextResponse.json({ error: 'Identifiant ou statut invalide.' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);

  return NextResponse.json({ success: true, id, status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const { productId, rating, customerName, city, comment, status = 'approuve' } = body as Record<string, unknown>;

  if (!customerName || !comment) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }

  const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
  const validStatus = ['approuve', 'en_attente', 'rejete'].includes(status as string) ? (status as string) : 'approuve';
  const validProductId = productId ? Number(productId) : null;

  const db = getDb();
  const info = db.prepare(`
    INSERT INTO reviews (product_id, rating, customer_name, city, comment, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    validProductId,
    numRating,
    String(customerName).trim().slice(0, 80),
    String(city || 'Cotonou').trim().slice(0, 60),
    String(comment).trim().slice(0, 1000),
    validStatus
  );

  return NextResponse.json({ success: true, id: info.lastInsertRowid });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));

  if (!id || !Number.isSafeInteger(id)) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);

  return NextResponse.json({ success: true, id });
}
