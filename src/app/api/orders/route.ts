import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder, getDb } from '@/lib/db';
import { isTursoEnabled, tursoCreateOrder } from '@/lib/turso';
import { sendOrderNotification } from '@/lib/notifications';
import { sendWhatsAppOrderNotification, formatWhatsAppMessage, getWhatsAppConfigAsync } from '@/lib/whatsapp';
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
  bundleId: z.string().trim().max(50).optional().nullable(),
  quantity: z.number().int().min(1).max(20).optional(),
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
    items?: Array<{ name: string; price: number; quantity: number }>;
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
          bundleId: data.bundleId,
          quantity: data.quantity,
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
          bundleId: data.bundleId,
          quantity: data.quantity,
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
      {
        error: 'Impossible de finaliser votre commande pour le moment. Veuillez réessayer.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }

  // 7. Notification push smartphone ntfy.sh
  try {
    const bundleName = data.bundleId
      ? data.bundleId === 'x1'
        ? '1 article'
        : data.bundleId === 'x2'
          ? 'Lot 2 articles'
          : data.bundleId === 'x3'
            ? 'Lot 3 articles'
            : `Lot ${data.bundleId.toUpperCase()}`
      : undefined;

    void sendOrderNotification({
      orderNumber: result.orderNumber,
      customerName: data.customerName,
      shippingCity: data.shippingCity,
      totalPrice: result.totalPrice,
      bundleTitle: bundleName,
      quantity: data.quantity || data.items[0]?.quantity || 1,
    });
  } catch (err) {
    console.error('Échec envoi notification ntfy :', err instanceof Error ? err.message : 'Erreur');
  }

  // 8. Notification WhatsApp automatique sur mesure au commerçant
  let whatsappDirectUrl = '';
  try {
    const waConfig = await getWhatsAppConfigAsync();
    const waItems =
      result.items && result.items.length > 0
        ? result.items
        : data.items.map((it) => ({
            name: `Article #${it.id}`,
            quantity: it.quantity,
            price: Math.round(result.subtotal / Math.max(1, data.items.length)),
          }));

    const orderNotificationPayload = {
      orderNumber: result.orderNumber,
      customerName: data.customerName,
      customerPhone: phoneValidation.normalized,
      shippingCity: data.shippingCity,
      neighborhood: data.neighborhood,
      landmark: data.landmark,
      items: waItems,
      totalPrice: result.totalPrice,
      shippingCost: result.shippingCost,
      subtotal: result.subtotal,
      paymentMethod: data.paymentMethod,
      customerNotes: data.customerNotes || undefined,
      adminBaseUrl: process.env.APP_URL || 'https://afrinova-shop.vercel.app',
    };

    const waMessage = formatWhatsAppMessage(waConfig.template, orderNotificationPayload);
    whatsappDirectUrl = `https://wa.me/${waConfig.phone}?text=${encodeURIComponent(waMessage)}`;

    // Envoi de la notification WhatsApp (attente pour sécuriser l'exécution sur Vercel Serverless)
    try {
      const waSendRes = await sendWhatsAppOrderNotification(orderNotificationPayload);
      if (!waSendRes.success) {
        console.warn('[WhatsApp Notification Notice]:', waSendRes.status);
      }
    } catch (err) {
      console.error('Échec envoi WhatsApp automatique :', err instanceof Error ? err.message : 'Erreur');
    }
  } catch (err) {
    console.error('Erreur préparation alerte WhatsApp :', err instanceof Error ? err.message : 'Erreur');
  }

  return NextResponse.json({
    ...result,
    whatsappNotifyUrl: whatsappDirectUrl,
    phoneNotice: phoneValidation.isOldFormat ? phoneValidation.message : undefined,
  });
}
