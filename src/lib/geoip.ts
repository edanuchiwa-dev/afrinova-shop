/**
 * Service de géolocalisation et de détection IP / FAI
 * Atelier Pro Bénin
 */

export type GeoLocation = {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  isp: string;
  org?: string;
  as?: string;
  latitude: number | null;
  longitude: number | null;
  timezone?: string;
  isLocal?: boolean;
};

// Cache en mémoire pour éviter les requêtes répétées (durée de vie : 24 heures)
const geoCache = new Map<string, { data: GeoLocation; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Extrait l'adresse IP client la plus fidèle possible depuis les en-têtes HTTP
 */
export function extractClientIp(headers: Headers): string {
  // 1. Cloudflare
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cleanIp(cfIp);

  // 2. Nginx / Caddy Real IP
  const realIp = headers.get('x-real-ip');
  if (realIp) return cleanIp(realIp);

  // 3. X-Forwarded-For (peut contenir une chaîne séparée par des virgules)
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((p) => cleanIp(p.trim())).filter(Boolean);
    // Préférer la première IP publique non privée si présente, sinon la première
    const publicIp = ips.find((ip) => !isPrivateOrLocalIp(ip));
    if (publicIp) return publicIp;
    if (ips.length > 0) return ips[0];
  }

  // 4. Autres en-têtes de proxies
  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp) return cleanIp(trueClientIp);

  const xClientIp = headers.get('x-client-ip');
  if (xClientIp) return cleanIp(xClientIp);

  return '127.0.0.1';
}

/**
 * Nettoie une adresse IP (supprime le port et les préfixes IPv6 mappés)
 */
function cleanIp(ipStr: string): string {
  let cleaned = ipStr.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.replace('::ffff:', '');
  }
  // Si format ip:port (IPv4)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(':')[0];
  }
  return cleaned;
}

/**
 * Détermine si une adresse IP est privée, de bouclage local ou bogon
 */
export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  return false;
}

/**
 * Normalise le nom de l'opérateur béninois ou international
 */
export function formatCarrierName(isp = '', org = '', as = ''): string {
  const full = `${isp} ${org} ${as}`.toLowerCase();
  if (full.includes('spacetel') || full.includes('mtn')) return 'MTN Bénin';
  if (full.includes('etisalat') || full.includes('moov') || full.includes('telecel')) return 'Moov Africa Bénin';
  if (full.includes('sbin') || full.includes('benin telecoms') || full.includes('celtiis')) return 'Celtiis / SBIN';
  if (full.includes('isocel')) return 'Isocel Telecom';
  if (full.includes('orange')) return 'Orange';
  if (full.includes('canalbox') || full.includes('gva')) return 'Canalbox Bénin (GVA)';
  if (full.includes('starlink')) return 'Starlink';
  if (isp) return isp.length > 25 ? isp.slice(0, 25) + '…' : isp;
  if (org) return org.length > 25 ? org.slice(0, 25) + '…' : org;
  return 'Fournisseur d\'Accès';
}

/**
 * Décode le User-Agent pour extraire le type d'appareil et le navigateur/application source
 */
export function parseUserAgent(ua: string | null | undefined): {
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
} {
  if (!ua) return { device: 'mobile', browser: 'Navigateur Web' };

  let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device = 'mobile';
  }

  let browser = 'Navigateur Web';
  if (/WhatsApp/i.test(ua)) {
    browser = 'WhatsApp In-App';
  } else if (/musical_ly|ByteLocale|TikTok/i.test(ua)) {
    browser = 'TikTok In-App';
  } else if (/Instagram/i.test(ua)) {
    browser = 'Instagram In-App';
  } else if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    browser = 'Facebook In-App';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Chrome/i.test(ua)) {
    browser = device === 'mobile' ? 'Chrome Mobile' : 'Google Chrome';
  } else if (/Safari/i.test(ua)) {
    browser = device === 'mobile' ? 'Safari Mobile' : 'Apple Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Opera|OPR/i.test(ua)) {
    browser = 'Opera';
  }

  return { device, browser };
}

/**
 * Résout la géolocalisation réelle à partir d'une adresse IP
 */
export async function lookupGeoIp(ip: string): Promise<GeoLocation> {
  const clean = cleanIp(ip);

  // 1. Gestion des adresses locales / développement
  if (isPrivateOrLocalIp(clean)) {
    return {
      ip: clean === '127.0.0.1' || clean === '::1' ? '127.0.0.1 (Localhost / Test)' : `${clean} (Réseau Local)`,
      city: 'Localhost',
      region: 'Réseau local',
      country: 'Local',
      countryCode: 'LO',
      isp: 'Réseau Local (Développement)',
      latitude: null,
      longitude: null,
      timezone: undefined,
      isLocal: true,
    };
  }

  // 2. Vérification du cache en mémoire
  const cached = geoCache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 3. Appel de résolution externe avec timeout strict (2.5 secondes max)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const result: GeoLocation = {
          ip: clean,
          city: data.city || 'Cotonou',
          region: data.regionName || 'Littoral',
          country: data.country === 'Benin' ? 'Bénin' : data.country || 'Bénin',
          countryCode: data.countryCode || 'BJ',
          isp: formatCarrierName(data.isp, data.org, data.as),
          org: data.org || '',
          as: data.as || '',
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          timezone: data.timezone || 'Africa/Porto-Novo',
          isLocal: false,
        };

        geoCache.set(clean, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return result;
      }
    }
  } catch (err) {
    // Si échec ou timeout, fallback silencieux
    console.warn(`[GeoIP] Lookup externe échoué pour ${clean}:`, (err as Error).message);
  }

  // 4. Fallback si service externe indisponible
  const fallbackResult: GeoLocation = {
    ip: clean,
    city: 'Non localisée',
    region: '',
    country: '',
    countryCode: '',
    isp: 'Fournisseur d\'Accès Inconnu',
    latitude: null,
    longitude: null,
    timezone: undefined,
    isLocal: false,
  };

  geoCache.set(clean, {
    data: fallbackResult,
    expiresAt: Date.now() + 5 * 60 * 1000, // cache court 5min en cas de fallback
  });

  return fallbackResult;
}
