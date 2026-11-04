/**
 * Calcul et configuration des livraisons locales pour le Bénin.
 * Tarifs stricts calculés côté serveur.
 */

export type BeninCityOption = {
  id: string;
  name: string;
  cost: number;
  deliveryTime: string;
};

export const BENIN_CITIES: BeninCityOption[] = [
  { id: 'cotonou', name: 'Cotonou', cost: 1000, deliveryTime: '24h ouvrées' },
  { id: 'abomey-calavi', name: 'Abomey-Calavi', cost: 1500, deliveryTime: '24h à 48h' },
  { id: 'godomey', name: 'Godomey', cost: 1500, deliveryTime: '24h à 48h' },
  { id: 'porto-novo', name: 'Porto-Novo', cost: 2000, deliveryTime: '24h à 48h' },
  { id: 'seme-kpodji', name: 'Sèmè-Kpodji', cost: 2000, deliveryTime: '24h à 48h' },
  { id: 'ouidah', name: 'Ouidah', cost: 2000, deliveryTime: '24h à 48h' },
  { id: 'bohicon', name: 'Bohicon', cost: 2500, deliveryTime: '48h ouvrées' },
  { id: 'abomey', name: 'Abomey', cost: 2500, deliveryTime: '48h ouvrées' },
  { id: 'parakou', name: 'Parakou', cost: 3000, deliveryTime: '48h à 72h' },
  { id: 'natitingou', name: 'Natitingou', cost: 3500, deliveryTime: '48h à 72h' },
  { id: 'djougou', name: 'Djougou', cost: 3500, deliveryTime: '48h à 72h' },
  { id: 'kandi', name: 'Kandi', cost: 3500, deliveryTime: '48h à 72h' },
  { id: 'autre', name: 'Autre commune du Bénin', cost: 3000, deliveryTime: '48h à 72h' },
];

export const BENIN_DELIVERY_MODES = [
  {
    id: 'domicile',
    name: 'Livraison express à domicile / bureau',
    description: 'Remis en main propre par notre coursier',
  },
  {
    id: 'relais',
    name: 'Retrait en boutique / point relais (Cotonou)',
    cost: 0,
    description: 'Gratuit • Disponible sous 24h à Haie Vive',
  },
] as const;

export function calculateServerShippingCost(city: string, carrier?: string): number {
  if (
    carrier &&
    (carrier.toLowerCase().includes('relais') ||
     carrier.toLowerCase().includes('retrait') ||
     carrier.toLowerCase().includes('gratuit') ||
     carrier.toLowerCase().includes('offert') ||
     carrier.toLowerCase().includes('convenir') ||
     carrier.toLowerCase().includes('direct'))
  ) {
    return 0;
  }

  const normalized = (city || '').trim().toLowerCase();

  const found = BENIN_CITIES.find((c) =>
    normalized.includes(c.id) || normalized.includes(c.name.toLowerCase())
  );

  if (found) {
    return found.cost;
  }

  if (normalized.includes('calavi') || normalized.includes('godomey')) return 1500;
  if (normalized.includes('porto') || normalized.includes('seme') || normalized.includes('sèmè')) return 2000;
  if (normalized.includes('parakou')) return 3000;
  if (normalized.includes('cotonou')) return 1000;

  return 3000; // Tarif standard par défaut
}
