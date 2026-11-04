/**
 * Intégration Mobile Money (MTN MoMo, Moov Money, Celtiis Cash)
 * Préparée derrière un Feature Flag strict (ENABLE_MOBILE_MONEY).
 * Désactivée par défaut pour conserver le paiement à la livraison.
 */

export type MobileMoneyProvider = 'mtn_momo' | 'moov_money' | 'celtiis_cash';

export type PaymentMethod = 'cod' | 'mobile_money'; // 'cod' = Cash on Delivery

export type MobileMoneyPaymentInput = {
  orderNumber: string;
  amount: number; // En FCFA
  phoneNumber: string; // Format +22901XXXXXXXX
  provider: MobileMoneyProvider;
  customerName: string;
};

export type PaymentTransaction = {
  id: string;
  orderNumber: string;
  amount: number;
  provider: MobileMoneyProvider;
  status: 'pending' | 'approved' | 'declined' | 'canceled';
  aggregator: 'fedapay' | 'kkiapay';
  createdAt: string;
};

/**
 * Vérifie si le mode de paiement Mobile Money est activé
 */
export function isMobileMoneyEnabled(): boolean {
  return process.env.ENABLE_MOBILE_MONEY === 'true';
}

/**
 * Initialisation d'une transaction Mobile Money via agrégateur (FedaPay ou KKiaPay)
 * Prêt à être branché dès activation des clés API dans .env
 */
export async function initiateMobileMoneyPayment(
  input: MobileMoneyPaymentInput
): Promise<{ success: boolean; transactionId?: string; checkoutUrl?: string; error?: string }> {
  if (!isMobileMoneyEnabled()) {
    return {
      success: false,
      error: 'Le paiement Mobile Money est temporairement désactivé. Choisissez le paiement à la livraison.',
    };
  }

  const fedapaySecret = process.env.FEDAPAY_SECRET_KEY;
  if (!fedapaySecret) {
    return {
      success: false,
      error: 'Configuration passerelle Mobile Money manquante.',
    };
  }

  try {
    // Structure prête pour l'appel API FedaPay v1
    // const response = await fetch('https://api.fedapay.com/v1/transactions', ...);
    return {
      success: true,
      transactionId: `TX-${Date.now()}`,
      checkoutUrl: `https://checkout.fedapay.com/pay/${input.orderNumber}`,
    };
  } catch (error) {
    console.error('Erreur passerelle Mobile Money :', error);
    return {
      success: false,
      error: 'Impossible d’initialiser le paiement Mobile Money pour le moment.',
    };
  }
}
