/**
 * Préparation des API de conversions côté serveur (Server-Side Tracking) :
 * - Meta Conversions API (CAPI)
 * - TikTok Events API
 * Permet de contourner les bloqueurs de publicité (AdBlock) et d'envoyer
 * des signaux fiables directement depuis le backend Next.js.
 */

export type ServerConversionEvent = {
  eventName: 'Purchase' | 'ViewContent';
  orderNumber?: string;
  value?: number;
  currency?: string;
  customerPhone?: string;
  customerName?: string;
  sourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
};

export async function sendMetaConversionEvent(
  event: ServerConversionEvent
): Promise<{ success: boolean; error?: string }> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { success: false, error: 'Meta CAPI non configuré dans .env' };
  }

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: event.sourceUrl,
        action_source: 'website',
        user_data: {
          client_ip_address: event.clientIp,
          client_user_agent: event.userAgent,
        },
        custom_data: {
          currency: event.currency || 'XOF',
          value: event.value,
          order_id: event.orderNumber,
        },
      },
    ],
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Meta CAPI HTTP ${res.status}: ${errText}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur Meta CAPI' };
  }
}

export async function sendTikTokConversionEvent(
  event: ServerConversionEvent
): Promise<{ success: boolean; error?: string }> {
  const pixelCode = process.env.TIKTOK_PIXEL_ID || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!pixelCode || !accessToken) {
    return { success: false, error: 'TikTok Events API non configuré dans .env' };
  }

  const payload = {
    pixel_code: pixelCode,
    event: event.eventName === 'Purchase' ? 'CompletePayment' : 'ViewContent',
    timestamp: new Date().toISOString(),
    context: {
      ip: event.clientIp,
      user_agent: event.userAgent,
    },
    properties: {
      currency: event.currency || 'XOF',
      value: event.value,
      order_id: event.orderNumber,
    },
  };

  try {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `TikTok API HTTP ${res.status}: ${errText}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erreur TikTok API' };
  }
}
