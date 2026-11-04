/**
 * Validation et normalisation des numéros de téléphone du Bénin (+229).
 * 
 * Historique national :
 * - Depuis fin 2024, le Bénin est passé de 8 à 10 chiffres (préfixe 01).
 *   Exemple : 97 00 11 22 devient 01 97 00 11 22.
 * - Le système valide le format à 10 chiffres et tolère l'ancien format à 8 chiffres
 *   en le convertissant automatiquement avec information claire.
 */

export type BeninPhoneResult = {
  valid: boolean;
  normalized?: string; // Format international standard: +22901XXXXXXXX
  formatted?: string;  // Format lisible: +229 01 XX XX XX XX
  isOldFormat?: boolean;
  message?: string;
};

export function parseBeninPhone(input: string): BeninPhoneResult {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      message: 'Veuillez saisir votre numéro de téléphone.',
    };
  }

  // Nettoyage de tous les caractères non numériques excepté le '+' initial
  let raw = input.trim().replace(/[\s\-\.\(\)\/]/g, '');

  // Suppression de l'indicatif international (+229, 00229, 229)
  if (raw.startsWith('+229')) {
    raw = raw.slice(4);
  } else if (raw.startsWith('00229')) {
    raw = raw.slice(5);
  } else if (raw.startsWith('229') && (raw.length === 11 || raw.length === 13)) {
    raw = raw.slice(3);
  }

  // Vérification qu'il ne reste que des chiffres
  if (!/^\d+$/.test(raw)) {
    return {
      valid: false,
      message: 'Le numéro ne doit contenir que des chiffres.',
    };
  }

  // CAS 1 : Ancien format à 8 chiffres (toléré et converti avec ajout du préfixe 01)
  if (raw.length === 8) {
    const upgraded = `01${raw}`;
    const normalized = `+229${upgraded}`;
    const formatted = `+229 01 ${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 6)} ${raw.slice(6, 8)}`;
    return {
      valid: true,
      normalized,
      formatted,
      isOldFormat: true,
      message: 'Numéro à 8 chiffres converti automatiquement au nouveau plan national à 10 chiffres (préfixe 01).',
    };
  }

  // CAS 2 : Nouveau format national à 10 chiffres
  if (raw.length === 10) {
    // Le plan de numérotation 2024+ exige le préfixe 01
    if (!raw.startsWith('01')) {
      return {
        valid: false,
        message: 'Le numéro national à 10 chiffres doit commencer par le préfixe 01 (ex: 01 97 XX XX XX).',
      };
    }
    const normalized = `+229${raw}`;
    const formatted = `+229 ${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 6)} ${raw.slice(6, 8)} ${raw.slice(8, 10)}`;
    return {
      valid: true,
      normalized,
      formatted,
      isOldFormat: false,
    };
  }

  return {
    valid: false,
    message: 'Numéro invalide. Format attendu : 10 chiffres (ex: 01 97 00 11 22 ou +229 01 97 00 11 22).',
  };
}
