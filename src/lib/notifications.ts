type OrderNotification = {
  orderNumber: string;
  customerName: string;
  shippingCity: string;
  totalPrice: number;
  bundleTitle?: string;
  quantity?: number;
};

export async function sendOrderNotification(
  order: OrderNotification,
): Promise<{ success: boolean; topic: string }> {
  // Topic long et difficilement devinable par défaut, surchargeable via variable d'environnement
  const topic = process.env.NTFY_TOPIC || 'afrinova-shop-benin-alertes-8f92a4c7e1b3d6f0';
  const token = process.env.NTFY_TOKEN;

  // Extraction stricte du prénom (premier mot) pour ne divulguer aucune donnée privée sensible
  const firstName = order.customerName.trim().split(/\s+/)[0] || 'Client';

  const body = [
    `Commande : ${order.orderNumber}`,
    `Client : ${firstName}`,
    `Ville : ${order.shippingCity}`,
    order.bundleTitle
      ? `Offre : ${order.bundleTitle} (x${order.quantity ?? 1})`
      : order.quantity && order.quantity > 1
        ? `Quantité : x${order.quantity}`
        : null,
    `Montant : ${order.totalPrice.toLocaleString('fr-FR')} FCFA`,
  ].filter(Boolean).join('\n');

  const headers: Record<string, string> = {
    Title: 'Nouvelle commande reçue !',
    Priority: 'high',
    Tags: 'package,moneybag,bell',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`ntfy.sh a retourné le code ${response.status}`);
    }

    return { success: true, topic };
  } catch (error) {
    console.error('Échec de la notification ntfy.sh :', error instanceof Error ? error.message : 'Erreur réseau');
    return { success: false, topic };
  }
}
