import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder, getDb } from '@/lib/db';
import { isTursoEnabled, tursoCreateOrder } from '@/lib/turso';
import { sendOrderNotification } from '@/lib/notifications';
import { sendWhatsAppOrderNotification, formatWhatsAppMessage, getWhatsAppConfig } from '@/lib/whatsapp';
import { parseBeninPhone } from '@/lib/phone';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const orderItemSchema = z.object({
  id: z.number().int().positive('Identifiant produit invalide'),
  quantity: z.number().int().min(1, 'Quantité minimum 1').max(10, 'Quantité maximum 10 par produit'),
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Veuillez saisir votre nom complet').max(100, 'Nom trop long'),
  customerPhone: z.string().trim().min(8, 'Numéro de téléphone requis').max(30, 'Numéro trop long'),
  shippingCity: z.string().trim().min(2, 'Veuillez sélectionner votre ville / commune').max(100),
  neighborhood: z.string().trim().max(100).optional().default(''),
  landmark: z.string().trim().max(200).optional().default(''),
  locationUrl: z.string().trim().max(500).optional().default(''),
  carrier: z.string().trim().min(2).max(100).optional().default('Livraison express domicile'),
  customerEmail: z.string().trim().email().max(150).optional().nullable().or(z.literal('')),
  customerNotes: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  paymentMethod: z.enum(['cod', 'mobile_money']).optional().default('cod'),
  items: z.array(orderItemSchema).min(1, 'Au moins un produit').max(20, 'Trop d’articles'),
  website: z.string().optional(), // Honeypot anti-bot
  utm_source: z.string().trim().max(100).optional().default(''),
  utm_medium: z.string().trim().max(100).optional().default(''),
  utm_campaign: z.string().trim().max(100).optional().default(''),
  referrer: z.string().trim().max(500).optional().default(''),
});

export async function POST(request: Request) {
  // 1. Rate limiting par IP (max 5 commandes par 10 minutes)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`order_${clientIp}`, 5, 600);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Trop de commandes passées récemment. Veuillez patienter avant de renouveler votre demande.' },
      { status: 429 }
    );
  }

  // 2. Décodage JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format de requête invalide.' }, { status: 400 });
  }

  // 3. Validation de structure avec Zod
  const parseResult = createOrderSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Données de commande incomplètes. Veuillez vérifier les champs obligatoires (nom, téléphone, ville).' },
      { status: 400 }
    );
  }

  const data = parseResult.data;

  // 4. Honeypot check
  if (data.website && data.website.trim().length > 0) {
    return NextResponse.json({ error: 'Données de commande invalides.' }, { status: 400 });
  }

  // 5. Validation et normalisation stricte du numéro béninois (+229)
  const phoneValidation = parseBeninPhone(data.customerPhone);
  if (!phoneValidation.valid || !phoneValidation.normalized) {
    return NextResponse.json(
      { error: phoneValidation.message || 'Numéro de téléphone invalide. Utilisez 10 chiffres (ex: 01 97 XX XX XX).' },
      { status: 400 }
    );
  }

  // 6. Création de la commande en transaction SQLite / Turso atomique
  let result: {
    success: true;
    orderNumber: string;
    totalPrice: number;
    shippingCost: number;
    normalizedPhone: string;
    subtotal: number;
    savings: number;
  };
  try {
    if (isTursoEnabled()) {
      result = await tursoCreateOrder(
        {
          customerName: data.customerName,
          customerPhone: phoneValidation.normalized,
          shippingCity: data.shippingCity,
          neighborhood: data.neighborhood,
          landmark: data.landmark,
          locationUrl: data.locationUrl,
          carrier: data.carrier,
          customerEmail: data.customerEmail || undefined,
          customerNotes: data.customerNotes || undefined,
          paymentMethod: data.paymentMethod,
          utm_source: data.utm_source,
          utm_medium: data.utm_medium,
          utm_campaign: data.utm_campaign,
          referrer: data.referrer,
        },
        data.items
      );
    } else {
      result = createOrder(
        {
          customerName: data.customerName,
          customerPhone: phoneValidation.normalized,
          shippingCity: data.shippingCity,
          neighborhood: data.neighborhood,
          landmark: data.landmark,
          locationUrl: data.locationUrl,
          carrier: data.carrier,
          customerEmail: data.customerEmail || undefined,
          customerNotes: data.customerNotes || undefined,
          paymentMethod: data.paymentMethod,
          utm_source: data.utm_source,
          utm_medium: data.utm_medium,
          utm_campaign: data.utm_campaign,
          referrer: data.referrer,
        },
        data.items
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Stock insuffisant') || message.includes('introuvable ou indisponible')) {
      return NextResponse.json(
        { error: 'Un ou plusieurs articles sont indisponibles ou en rupture de stock.' },
        { status: 400 }
      );
    }
    console.error('Erreur interne lors de la commande :', error instanceof Error ? error.message : 'Erreur');
    return NextResponse.json(
      { error: 'Impossible de finaliser votre commande pour le moment. Veuillez réessayer.' },
      { status: 500 }
    );
  }

  // 7. Notification push smartphone ntfy.sh
  try {
    void sendOrderNotification({
      orderNumber: result.orderNumber,
      customerName: data.customerName,
      shippingCity: data.shippingCity,
      totalPrice: result.totalPrice,
    });
  } catch (err) {
    console.error('Échec envoi notification ntfy :', err instanceof Error ? err.message : 'Erreur');
  }

  // 8. Notification WhatsApp automatique sur mesure au commerçant
  let whatsappDirectUrl = '';
  try {
    const db = getDb();
    const orderItems = db.prepare(`
      SELECT product_name as name, quantity, product_price as price
      FROM order_items
      WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)
      ORDER BY id
    `).all(result.orderNumber) as Array<{ name: string; quantity: number; price: number }>;

    const orderNotificationPayload = {
      orderNumber: result.orderNumber,
      customerName: data.customerName,
      customerPhone: phoneValidation.normalized,
      shippingCity: data.shippingCity,
      neighborhood: data.neighborhood,
      landmark: data.landmark,
      items: orderItems,
      totalPrice: result.totalPrice,
      shippingCost: result.shippingCost,
      subtotal: result.subtotal,
      paymentMethod: data.paymentMethod,
      customerNotes: data.customerNotes || undefined,
    };

    const waConfig = getWhatsAppConfig();
    const waMessage = formatWhatsAppMessage(waConfig.template, orderNotificationPayload);
    whatsappDirectUrl = `https://wa.me/${waConfig.phone}?text=${encodeURIComponent(waMessage)}`;

    // Envoi asynchrone non-bloquant
    void sendWhatsAppOrderNotification(orderNotificationPayload).catch((err) => {
      console.error('Échec envoi WhatsApp automatique :', err instanceof Error ? err.message : 'Erreur');
    });
  } catch (err) {
    console.error('Erreur préparation alerte WhatsApp :', err instanceof Error ? err.message : 'Erreur');
  }

  return NextResponse.json({
    ...result,
    whatsappNotifyUrl: whatsappDirectUrl,
    phoneNotice: phoneValidation.isOldFormat ? phoneValidation.message : undefined,
  });
}
