/**
 * Formatage des prix en Francs CFA (XOF)
 * Pas de centimes ni décimales, séparateur de milliers propre.
 * Ex: 18900 -> "18 900 FCFA"
 */
export function formatFCFA(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(rounded)} FCFA`;
}
