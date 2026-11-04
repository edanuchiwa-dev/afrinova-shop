import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { parseBeninPhone } from '@/lib/phone';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`track_${ip}`, 10, 600); // 10 vérifications par 10 minutes
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Trop de tentatives de recherche. Veuillez réessayer dans quelques minutes.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format de requête invalide.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const { orderNumber, phone } = body as Record<string, unknown>;

  if (typeof orderNumber !== 'string' || !orderNumber.trim()) {
    return NextResponse.json({ error: 'Veuillez saisir votre numéro de commande.' }, { status: 400 });
  }

  if (typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'Veuillez renseigner votre numéro de téléphone.' }, { status: 400 });
  }

  const cleanOrderNum = orderNumber.trim().toUpperCase();
  const phoneCheck = parseBeninPhone(phone);
  const normalizedInputPhone = phoneCheck.valid && phoneCheck.normalized ? phoneCheck.normalized : phone.trim().replace(/[\s\-\.]/g, '');

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(cleanOrderNum) as
    | (Record<string, unknown> & { id: number; customer_phone: string })
    | undefined;

  if (!order) {
    return NextResponse.json(
      { error: 'Aucune commande trouvée correspondant à ce numéro et ce téléphone.' },
      { status: 404 }
    );
  }

  // Vérification de sécurité sur le téléphone pour ne pas exposer les données d'autrui
  const storedPhoneCheck = parseBeninPhone(order.customer_phone);
  const normalizedStoredPhone = storedPhoneCheck.valid && storedPhoneCheck.normalized
    ? storedPhoneCheck.normalized
    : order.customer_phone.replace(/[\s\-\.]/g, '');

  const isPhoneMatch =
    normalizedStoredPhone === normalizedInputPhone ||
    normalizedStoredPhone.endsWith(normalizedInputPhone.slice(-8)) ||
    normalizedInputPhone.endsWith(normalizedStoredPhone.slice(-8));

  if (!isPhoneMatch) {
    return NextResponse.json(
      { error: 'Le numéro de téléphone ne correspond pas à cette commande.' },
      { status: 403 }
    );
  }

  const items = db
    .prepare('SELECT product_name, quantity, product_price FROM order_items WHERE order_id = ?')
    .all(order.id) as Array<{ product_name: string; quantity: number; product_price: number }>;

  return NextResponse.json({
    orderNumber: order.order_number,
    status: order.status,
    carrier: order.carrier,
    trackingNumber: order.tracking_number || null,
    shippingCity: order.shipping_city,
    neighborhood: order.neighborhood || '',
    totalPrice: order.total_price,
    shippingCost: order.shipping_cost,
    createdAt: order.created_at,
    items,
  });
}
