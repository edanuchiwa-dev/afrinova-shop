import { NextResponse } from 'next/server';
import { getDb, updateOrderStatus } from '@/lib/db';
import { isTursoEnabled, getTursoClient, tursoUpdateOrderStatus } from '@/lib/turso';

export const runtime = 'nodejs';

const validStatuses = new Set(['nouvelle', 'en_preparation', 'expediee', 'livree', 'annulee']);

export async function GET() {
  if (isTursoEnabled()) {
    const client = getTursoClient();
    const ordersRes = await client.execute('SELECT * FROM orders ORDER BY id DESC');
    const orders = ordersRes.rows as unknown as Array<Record<string, unknown> & { id: number }>;
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const itemRes = await client.execute({
          sql: 'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
          args: [order.id],
        });
        return { ...order, items: itemRes.rows };
      })
    );
    return NextResponse.json(ordersWithItems);
  }

  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all() as Array<Record<string, unknown> & { id: number }>;
  const findItems = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id');
  return NextResponse.json(orders.map((order) => ({ ...order, items: findItems.all(order.id) })));
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const { id, status, tracking_number } = body as Record<string, unknown>;

  if (
    !Number.isSafeInteger(id) ||
    (id as number) <= 0 ||
    (status === undefined && tracking_number === undefined) ||
    (status !== undefined && !validStatuses.has(status as string)) ||
    (tracking_number !== undefined && typeof tracking_number !== 'string')
  ) {
    return NextResponse.json({ error: 'Identifiant, statut ou numéro de suivi invalide.' }, { status: 400 });
  }

  try {
    if (isTursoEnabled()) {
      const updated = await tursoUpdateOrderStatus(
        id as number,
        status as string | undefined,
        tracking_number as string | undefined
      );
      return NextResponse.json(updated);
    }
    const updated = updateOrderStatus(
      id as number,
      status as string | undefined,
      tracking_number as string | undefined
    );
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la commande.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
