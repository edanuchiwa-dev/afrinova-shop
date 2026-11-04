import { NextResponse } from 'next/server';
import { getWhatsAppConfig, saveWhatsAppConfig, DEFAULT_WHATSAPP_TEMPLATE } from '@/lib/whatsapp';
import { getSetting } from '@/lib/db';

export const runtime = 'nodejs';

export function GET() {
  try {
    const config = getWhatsAppConfig();
    const lastStatus = getSetting('whatsapp_notify_last_status', 'Aucun envoi récent');
    const lastSentAt = getSetting('whatsapp_notify_last_sent_at', '');

    return NextResponse.json({
      ...config,
      defaultTemplate: DEFAULT_WHATSAPP_TEMPLATE,
      lastStatus,
      lastSentAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur de lecture des paramètres WhatsApp';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Format de requête invalide.' }, { status: 400 });
    }

    const { enabled, phone, provider, apiKey, idInstance, webhookUrl, template } = body;

    saveWhatsAppConfig({
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      phone: typeof phone === 'string' ? phone : undefined,
      provider: provider === 'webhook' ? 'webhook' : provider === 'greenapi' ? 'greenapi' : 'callmebot',
      apiKey: typeof apiKey === 'string' ? apiKey : undefined,
      idInstance: typeof idInstance === 'string' ? idInstance : undefined,
      webhookUrl: typeof webhookUrl === 'string' ? webhookUrl : undefined,
      template: typeof template === 'string' ? template : undefined,
    });

    const updated = getWhatsAppConfig();
    return NextResponse.json({
      success: true,
      config: updated,
      message: 'Paramètres WhatsApp enregistrés avec succès.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
