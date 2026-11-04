import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizePhoneForWhatsApp,
  formatWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATE,
  getWhatsAppConfig,
  saveWhatsAppConfig,
} from '../src/lib/whatsapp.ts';

test('▶ Module WhatsApp — Tests Unitaires & Formatage sur mesure', async (t) => {
  await t.test('1. Normalisation du numéro pour WhatsApp & CallMeBot', () => {
    assert.equal(sanitizePhoneForWhatsApp('0197000000'), '2290197000000');
    assert.equal(sanitizePhoneForWhatsApp('+229 01 97 12 34 56'), '2290197123456');
    assert.equal(sanitizePhoneForWhatsApp('97000000'), '22997000000');
    assert.equal(sanitizePhoneForWhatsApp('22997112233'), '22997112233');
    assert.equal(sanitizePhoneForWhatsApp(''), '');
  });

  await t.test('2. Remplacement exhaustif des variables dans le message sur mesure', () => {
    const template = `Commande: {order_number} | Client: {customer_name} ({customer_phone}) | Ville: {shipping_city} | Articles: {items_simple} | Total: {total_price} FCFA | Port: {shipping_cost} FCFA | Mode: {payment_method}`;

    const data = {
      orderNumber: 'CMD-TEST-777',
      customerName: 'Sèna Dossou',
      customerPhone: '+229 01 97 00 11 22',
      shippingCity: 'Abomey-Calavi',
      neighborhood: 'Arconville',
      landmark: 'Carrefour IITA',
      items: [
        { name: 'Montre Chronographe', quantity: 1, price: 35000 },
        { name: 'Bracelet Cuir', quantity: 2, price: 5000 },
      ],
      totalPrice: 46500,
      shippingCost: 1500,
      subtotal: 45000,
      paymentMethod: 'cod',
      customerNotes: 'Merci de livrer avant 14h',
    };

    const result = formatWhatsAppMessage(template, data);

    assert.ok(result.includes('CMD-TEST-777'));
    assert.ok(result.includes('Sèna Dossou'));
    assert.ok(result.includes('+229 01 97 00 11 22'));
    assert.ok(result.includes('Abomey-Calavi'));
    assert.ok(result.includes('1x Montre Chronographe, 2x Bracelet Cuir'));
    assert.ok(result.includes('46 500') || result.includes('46 500'));
    assert.ok(result.includes('1 500') || result.includes('1 500'));
    assert.ok(result.includes('Paiement en espèces à la livraison'));
  });

  await t.test('3. Modèle par défaut riche avec emojis et mise en forme WhatsApp (*bold*)', () => {
    const data = {
      orderNumber: 'CMD-DEFAULT-99',
      customerName: 'Gaston K.',
      customerPhone: '+229 01 96 11 22 33',
      shippingCity: 'Cotonou',
      neighborhood: 'Cadjehoun',
      landmark: 'Face pharmacie',
      items: [{ name: 'Sac Cuir Prestige', quantity: 1, price: 25000 }],
      totalPrice: 26000,
      shippingCost: 1000,
      subtotal: 25000,
      paymentMethod: 'cod',
      adminBaseUrl: 'http://localhost:3000',
    };

    const formatted = formatWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, data);

    assert.ok(formatted.includes('🚨 *NOUVELLE COMMANDE REÇUE !*'));
    assert.ok(formatted.includes('CMD-DEFAULT-99'));
    assert.ok(formatted.includes('Gaston K.'));
    assert.ok(formatted.includes('Sac Cuir Prestige'));
    assert.ok(formatted.includes('http://localhost:3000/admin?search=CMD-DEFAULT-99'));
  });

  await t.test('4. Persistance et relecture de la configuration WhatsApp en base de données', () => {
    const original = getWhatsAppConfig();
    try {
      saveWhatsAppConfig({
        enabled: true,
        phone: '0197998877',
        provider: 'callmebot',
        apiKey: 'test_api_key_123',
        template: 'Alerte: {order_number} pour {customer_name}',
      });

      const loaded = getWhatsAppConfig();
      assert.equal(loaded.enabled, true);
      assert.equal(loaded.phone, '2290197998877');
      assert.equal(loaded.provider, 'callmebot');
      assert.equal(loaded.apiKey, 'test_api_key_123');
      assert.equal(loaded.template, 'Alerte: {order_number} pour {customer_name}');
    } finally {
      saveWhatsAppConfig(original);
    }
  });
});
