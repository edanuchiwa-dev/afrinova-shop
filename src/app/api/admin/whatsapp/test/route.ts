import { NextResponse } from 'next/server';
import { formatWhatsAppMessage, sendWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATE, sanitizePhoneForWhatsApp } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, apiKey, idInstance, provider, webhookUrl, template } = body;

    const targetPhone = sanitizePhoneForWhatsApp(phone || '');
    if (!targetPhone) {
      return NextResponse.json(
        { error: 'Veuillez saisir un numéro de téléphone WhatsApp valide.' },
        { status: 400 }
      );
    }

    const testData = {
      orderNumber: 'CMD-TEST-2026',
      customerName: 'Koffi Mensah (Test)',
      customerPhone: '+229 01 97 00 12 34',
      shippingCity: 'Cotonou',
      neighborhood: 'Haie Vive',
      landmark: 'Face Hôtel Bénin Royal',
      items: [
        { name: 'Montre Chronographe Prestige (Exemple Test)', quantity: 1, price: 35000 },
      ],
      totalPrice: 36000,
      shippingCost: 1000,
      subtotal: 35000,
      paymentMethod: 'cod',
      customerNotes: 'Ceci est un test de notification WhatsApp en direct.',
    };

    const messageTemplate = template || DEFAULT_WHATSAPP_TEMPLATE;
    const formattedMessage = formatWhatsAppMessage(messageTemplate, testData);

    const result = await sendWhatsAppMessage(targetPhone, formattedMessage, {
      phone: targetPhone,
      apiKey: apiKey || '',
      idInstance: idInstance || '',
      provider: provider === 'webhook' ? 'webhook' : provider === 'greenapi' ? 'greenapi' : 'callmebot',
      webhookUrl: webhookUrl || '',
      template: messageTemplate,
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      directUrl: result.directUrl,
      formattedMessage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi du message test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
