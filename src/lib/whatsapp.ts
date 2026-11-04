import { getSetting, setSetting } from './db.ts';

export interface WhatsAppConfig {
  enabled: boolean;
  phone: string;
  provider: 'callmebot' | 'greenapi' | 'webhook';
  apiKey: string;
  idInstance?: string;
  webhookUrl: string;
  template: string;
}

export interface WhatsAppOrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingCity: string;
  neighborhood?: string;
  landmark?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalPrice: number;
  shippingCost: number;
  subtotal: number;
  paymentMethod?: string;
  customerNotes?: string;
  adminBaseUrl?: string;
}

export const DEFAULT_WHATSAPP_TEMPLATE = `🚨 *NOUVELLE COMMANDE REÇUE !*

📦 *Commande :* {order_number}
👤 *Client :* {customer_name}
📞 *Téléphone :* {customer_phone}
📍 *Ville :* {shipping_city}
🏡 *Quartier / Repère :* {neighborhood} {landmark}

🛍️ *Articles :*
{items}

💰 *Total à encaisser :* {total_price} FCFA
🚚 *Livraison :* {shipping_cost} FCFA
💳 *Paiement :* {payment_method}
📝 *Note :* {notes}
📅 *Date :* {date}

🔗 *Gérer la commande :* {admin_url}`;

export function sanitizePhoneForWhatsApp(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('229')) {
    return digits;
  }
  if (digits.length === 8) {
    return `229${digits}`;
  }
  if (digits.length === 10 && digits.startsWith('01')) {
    return `229${digits}`;
  }
  return digits;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  let enabledStr = '1';
  const defaultPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '2290197000000';
  let phone = defaultPhone;
  let provider: 'callmebot' | 'greenapi' | 'webhook' = 'callmebot';
  let apiKey = '';
  let idInstance = '';
  let webhookUrl = '';
  let rawTemplate = '';

  try {
    enabledStr = getSetting('whatsapp_notify_enabled', '1');
    phone = getSetting('whatsapp_notify_phone', defaultPhone);
    provider = (getSetting('whatsapp_notify_provider', 'callmebot') as 'callmebot' | 'greenapi' | 'webhook') || 'callmebot';
    apiKey = getSetting('whatsapp_notify_apikey', '');
    idInstance = getSetting('whatsapp_notify_id_instance', '');
    webhookUrl = getSetting('whatsapp_notify_webhook_url', '');
    rawTemplate = getSetting('whatsapp_notify_template', '');
  } catch {
    // Tolérance d'échec si la base locale SQLite n'est pas instanciable (ex. Vercel)
  }

  const template = rawTemplate && rawTemplate.trim() ? rawTemplate : DEFAULT_WHATSAPP_TEMPLATE;

  return {
    enabled: enabledStr === '1',
    phone: sanitizePhoneForWhatsApp(phone),
    provider,
    apiKey,
    idInstance,
    webhookUrl,
    template,
  };
}

export function saveWhatsAppConfig(config: Partial<WhatsAppConfig>): void {
  if (config.enabled !== undefined) {
    setSetting('whatsapp_notify_enabled', config.enabled ? '1' : '0');
  }
  if (config.phone !== undefined) {
    setSetting('whatsapp_notify_phone', sanitizePhoneForWhatsApp(config.phone));
  }
  if (config.provider !== undefined) {
    setSetting('whatsapp_notify_provider', config.provider);
  }
  if (config.apiKey !== undefined) {
    setSetting('whatsapp_notify_apikey', config.apiKey.trim());
  }
  if (config.idInstance !== undefined) {
    setSetting('whatsapp_notify_id_instance', config.idInstance.trim());
  }
  if (config.webhookUrl !== undefined) {
    setSetting('whatsapp_notify_webhook_url', config.webhookUrl.trim());
  }
  if (config.template !== undefined) {
    setSetting('whatsapp_notify_template', config.template.trim());
  }
}

export function formatWhatsAppMessage(template: string, data: WhatsAppOrderData): string {
  const itemsFormatted = data.items && data.items.length > 0
    ? data.items
        .map((item) => `• ${item.quantity}x ${item.name} (${(item.price * item.quantity).toLocaleString('fr-FR')} FCFA)`)
        .join('\n')
    : 'Aucun article';

  const itemsSimple = data.items && data.items.length > 0
    ? data.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')
    : 'Aucun article';

  const paymentLabel =
    data.paymentMethod === 'mobile_money'
      ? 'Mobile Money (MTN / Moov)'
      : 'Paiement en espèces à la livraison';

  const dateStr = new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const adminBaseUrl = data.adminBaseUrl || process.env.APP_URL || 'http://localhost:3000';
  const adminUrl = `${adminBaseUrl}/admin?search=${encodeURIComponent(data.orderNumber)}`;

  return template
    .replace(/{order_number}/g, data.orderNumber)
    .replace(/{customer_name}/g, data.customerName)
    .replace(/{customer_phone}/g, data.customerPhone)
    .replace(/{shipping_city}/g, data.shippingCity)
    .replace(/{neighborhood}/g, data.neighborhood ? `Quartier ${data.neighborhood}` : '')
    .replace(/{landmark}/g, data.landmark ? `(Repère: ${data.landmark})` : '')
    .replace(/{items}/g, itemsFormatted)
    .replace(/{items_simple}/g, itemsSimple)
    .replace(/{total_price}/g, data.totalPrice.toLocaleString('fr-FR'))
    .replace(/{shipping_cost}/g, data.shippingCost.toLocaleString('fr-FR'))
    .replace(/{subtotal}/g, data.subtotal.toLocaleString('fr-FR'))
    .replace(/{payment_method}/g, paymentLabel)
    .replace(/{notes}/g, data.customerNotes || 'Aucune note')
    .replace(/{date}/g, dateStr)
    .replace(/{admin_url}/g, adminUrl);
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  overrideConfig?: Partial<WhatsAppConfig>
): Promise<{ success: boolean; status: string; directUrl: string }> {
  const currentConfig = getWhatsAppConfig();
  const config = { ...currentConfig, ...overrideConfig };
  const targetPhone = sanitizePhoneForWhatsApp(phone || config.phone);
  const directUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

  if (!targetPhone) {
    const errorMsg = 'Numéro WhatsApp manquant ou invalide.';
    setSetting('whatsapp_notify_last_status', `Erreur: ${errorMsg}`);
    return { success: false, status: errorMsg, directUrl };
  }

  if (config.provider === 'callmebot') {
    if (!config.apiKey) {
      const errorMsg = "Clé API CallMeBot non configurée. Utilisez le lien direct WhatsApp ou configurez l'API key.";
      setSetting('whatsapp_notify_last_status', `Attention: ${errorMsg}`);
      return { success: false, status: errorMsg, directUrl };
    }

    try {
      const formattedPhone = targetPhone.startsWith('+') ? targetPhone : `+${targetPhone}`;
      const endpoint = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        formattedPhone
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(config.apiKey)}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      });

      const responseText = await response.text();
      const isSuccess = response.ok && (
        responseText.toLowerCase().includes('success') ||
        responseText.toLowerCase().includes('queued') ||
        responseText.toLowerCase().includes('message sent')
      );

      const statusDetail = isSuccess
        ? 'Message WhatsApp transmis avec succès à CallMeBot.'
        : `Réponse CallMeBot: ${responseText.replace(/<[^>]*>?/gm, '').trim() || `Code ${response.status}`}`;

      setSetting('whatsapp_notify_last_status', statusDetail);
      setSetting('whatsapp_notify_last_sent_at', new Date().toISOString());

      return {
        success: isSuccess || response.ok,
        status: statusDetail,
        directUrl,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur réseau CallMeBot';
      setSetting('whatsapp_notify_last_status', `Erreur réseau: ${errorMsg}`);
      return { success: false, status: `Erreur: ${errorMsg}`, directUrl };
    }
  }

  if (config.provider === 'greenapi') {
    if (!config.idInstance || !config.apiKey) {
      const errorMsg = 'ID Instance ou Clé API Token Green-API manquante.';
      setSetting('whatsapp_notify_last_status', `Erreur: ${errorMsg}`);
      return { success: false, status: errorMsg, directUrl };
    }

    try {
      const endpoint = `https://api.green-api.com/waInstance${config.idInstance}/sendMessage/${config.apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${targetPhone}@c.us`,
          message,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const isSuccess = response.ok && Boolean(data.idMessage);
      const statusDetail = isSuccess
        ? `Message WhatsApp transmis via Green-API (ID: ${data.idMessage})`
        : `Échec Green-API: ${JSON.stringify(data) || `Code ${response.status}`}`;

      setSetting('whatsapp_notify_last_status', statusDetail);
      setSetting('whatsapp_notify_last_sent_at', new Date().toISOString());

      return { success: isSuccess, status: statusDetail, directUrl };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur réseau Green-API';
      setSetting('whatsapp_notify_last_status', `Erreur Green-API: ${errorMsg}`);
      return { success: false, status: `Erreur: ${errorMsg}`, directUrl };
    }
  }

  if (config.provider === 'webhook') {
    if (!config.webhookUrl) {
      const errorMsg = 'URL du Webhook non renseignée.';
      setSetting('whatsapp_notify_last_status', `Erreur: ${errorMsg}`);
      return { success: false, status: errorMsg, directUrl };
    }

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          event: 'order.created',
          phone: targetPhone,
          message,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      });

      const isSuccess = response.ok;
      const statusDetail = isSuccess
        ? `Webhook notifié avec succès (${response.status})`
        : `Échec Webhook (code HTTP ${response.status})`;

      setSetting('whatsapp_notify_last_status', statusDetail);
      setSetting('whatsapp_notify_last_sent_at', new Date().toISOString());

      return { success: isSuccess, status: statusDetail, directUrl };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur réseau Webhook';
      setSetting('whatsapp_notify_last_status', `Erreur Webhook: ${errorMsg}`);
      return { success: false, status: `Erreur: ${errorMsg}`, directUrl };
    }
  }

  return { success: true, status: 'Lien direct WhatsApp prêt', directUrl };
}

export async function sendWhatsAppOrderNotification(
  data: WhatsAppOrderData
): Promise<{ success: boolean; status: string; directUrl: string }> {
  const config = getWhatsAppConfig();
  if (!config.enabled) {
    const directUrl = `https://wa.me/${config.phone}?text=${encodeURIComponent(
      formatWhatsAppMessage(config.template, data)
    )}`;
    return { success: false, status: 'Alertes WhatsApp désactivées', directUrl };
  }

  const message = formatWhatsAppMessage(config.template, data);
  return sendWhatsAppMessage(config.phone, message, config);
}
