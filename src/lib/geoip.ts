/**
 * Service de géolocalisation et de détection IP / FAI de haute précision
 * AFRINOVA SHOP Bénin
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
  precision: 'gps' | 'edge' | 'ip' | 'declared';
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

function cleanIp(ipStr: string): string {
  let cleaned = ipStr.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.replace('::ffff:', '');
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(':')[0];
  }
  return cleaned;
}

export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  return false;
}

/**
 * Table de correspondance des départements du Bénin (Codes ISO / Vercel Edge)
 */
const BENIN_REGIONS_MAP: Record<string, string> = {
  LI: 'Littoral (Cotonou)',
  AQ: 'Atlantique (Calavi / Ouidah)',
  OU: 'Ouémé (Porto-Novo)',
  BO: 'Borgou (Parakou)',
  ZO: 'Zou (Bohicon / Abomey)',
  MO: 'Mono (Lokossa / Comè)',
  CO: 'Couffo (Aplahoué)',
  PL: 'Plateau (Pobè / Sakété)',
  DO: 'Donga (Djougou)',
  AT: 'Atacora (Natitingou)',
  AL: 'Alibori (Kandi / Malanville)',
  CL: 'Collines (Dassa / Savè)',
};

/**
 * Normalise et détecte avec précision l'opérateur béninois ou international
 */
export function formatCarrierName(isp = '', org = '', as = '', asNumber = ''): string {
  const full = `${isp} ${org} ${as} ${asNumber}`.toLowerCase();

  // 1. Celtiis / SBIN (Opérateur National Béninois)
  if (
    full.includes('sbin') ||
    full.includes('celtiis') ||
    full.includes('benin telecoms') ||
    full.includes('328228') ||
    full.includes('28683') ||
    full.includes('37662')
  ) {
    return 'Celtiis / SBIN (Bénin)';
  }

  // 2. MTN Bénin
  if (
    full.includes('spacetel') ||
    full.includes('mtn') ||
    full.includes('scancom') ||
    full.includes('37149')
  ) {
    return 'MTN Bénin (4G/LTE)';
  }

  // 3. Moov Africa Bénin
  if (
    full.includes('etisalat') ||
    full.includes('moov') ||
    full.includes('telecel') ||
    full.includes('28666') ||
    full.includes('30983')
  ) {
    return 'Moov Africa Bénin';
  }

  // 4. Fournisseurs Fibre et Fournisseurs d'accès béninois
  if (full.includes('isocel') || full.includes('37678')) return 'Isocel Telecom Bénin';
  if (full.includes('canalbox') || full.includes('gva') || full.includes('328008')) return 'Canalbox Bénin (Fibre GVA)';
  if (full.includes('jeny') || full.includes('oti') || full.includes('327850')) return 'Jeny / Oti Bénin';
  if (full.includes('starlink')) return 'Starlink Internet';
  if (full.includes('orange')) return 'Orange';

  if (isp) return isp.length > 25 ? isp.slice(0, 25) + '…' : isp;
  if (org) return org.length > 25 ? org.slice(0, 25) + '…' : org;
  return 'Fournisseur d\'Accès';
}

/**
 * Raffine la géolocalisation pour le Bénin : identifie le quartier, arrondissement et commune exacte
 */
export function refineBeninLocation(
  lat: number | null | undefined,
  lon: number | null | undefined,
  fallbackCity = 'Cotonou',
  fallbackRegion = 'Littoral'
): { city: string; region: string; precision: 'gps' | 'edge' | 'ip' } {
  if (lat == null || lon == null) {
    return { city: fallbackCity || 'Cotonou', region: fallbackRegion || 'Littoral', precision: 'ip' };
  }

  // Cotonou et ses arrondissements principaux
  if (lat >= 6.33 && lat <= 6.395 && lon >= 2.33 && lon <= 2.49) {
    if (lon < 2.375) return { city: 'Cotonou (Fidjrossè / Fiyégnon)', region: 'Littoral (12e Arr.)', precision: 'gps' };
    if (lon >= 2.375 && lon < 2.405) return { city: 'Cotonou (Haie Vive / Cadjehoun)', region: 'Littoral (12e Arr.)', precision: 'gps' };
    if (lon >= 2.405 && lon < 2.435) return { city: 'Cotonou (Ganhi / Saint-Michel)', region: 'Littoral (Centre)', precision: 'gps' };
    if (lon >= 2.435) return { city: 'Cotonou (Akpakpa / PK3)', region: 'Littoral (1er-4e Arr.)', precision: 'gps' };
    return { city: 'Cotonou', region: 'Littoral', precision: 'gps' };
  }

  // Quartiers Nord de Cotonou : Agla, Menontin, Zogbo, Sainte-Rita
  if (lat > 6.375 && lat <= 6.415 && lon >= 2.36 && lon <= 2.42) {
    return { city: 'Cotonou (Agla / Menontin / Zogbo)', region: 'Littoral (9e-13e Arr.)', precision: 'gps' };
  }

  // Abomey-Calavi (Godomey, Akassato, Calavi Kpota, Arconville, UAC)
  if (lat >= 6.38 && lat <= 6.56 && lon >= 2.26 && lon <= 2.39) {
    if (lat < 6.425) return { city: 'Abomey-Calavi (Godomey / Dèkoungbé)', region: 'Atlantique', precision: 'gps' };
    if (lat < 6.47) return { city: 'Abomey-Calavi (Centre / UAC)', region: 'Atlantique', precision: 'gps' };
    return { city: 'Abomey-Calavi (Akassato / Zinvié)', region: 'Atlantique', precision: 'gps' };
  }

  // Porto-Novo (Capitale)
  if (lat >= 6.45 && lat <= 6.54 && lon >= 2.56 && lon <= 2.68) {
    return { city: 'Porto-Novo (Capitale)', region: 'Ouémé', precision: 'gps' };
  }

  // Sèmè-Kpodji / Ekpè / Kraké
  if (lat >= 6.35 && lat <= 6.46 && lon >= 2.49 && lon <= 2.58) {
    return { city: 'Sèmè-Kpodji (Ekpè / Kraké)', region: 'Ouémé', precision: 'gps' };
  }

  // Ouidah
  if (lat >= 6.33 && lat <= 6.42 && lon >= 2.02 && lon <= 2.16) {
    return { city: 'Ouidah', region: 'Atlantique', precision: 'gps' };
  }

  // Parakou
  if (lat >= 9.28 && lat <= 9.42 && lon >= 2.56 && lon <= 2.68) {
    return { city: 'Parakou', region: 'Borgou', precision: 'gps' };
  }

  // Bohicon & Abomey
  if (lat >= 7.14 && lat <= 7.24 && lon >= 1.95 && lon <= 2.12) {
    return { city: 'Bohicon / Abomey', region: 'Zou', precision: 'gps' };
  }

  // Djougou
  if (lat >= 9.65 && lat <= 9.75 && lon >= 1.60 && lon <= 1.75) {
    return { city: 'Djougou', region: 'Donga', precision: 'gps' };
  }

  // Natitingou
  if (lat >= 10.25 && lat <= 10.38 && lon >= 1.32 && lon <= 1.45) {
    return { city: 'Natitingou', region: 'Atacora', precision: 'gps' };
  }

  return { city: fallbackCity || 'Cotonou', region: fallbackRegion || 'Littoral', precision: 'edge' };
}

/**
 * Détecte si le User-Agent ou le FAI correspond à un robot, crawler, scraper ou navigateur headless
 */
export function isBotOrCrawler(ua: string | null | undefined, isp?: string): boolean {
  if (!ua || typeof ua !== 'string') return true;
  const lowerUa = ua.toLowerCase();

  const botPatterns = [
    'headlesschrome',
    'headless',
    'googlebot',
    'bingbot',
    'yandexbot',
    'baiduspider',
    'duckduckbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'pinterestbot',
    'crawler',
    'spider',
    'lighthouse',
    'puppeteer',
    'playwright',
    'selenium',
    'phantomjs',
    'python-requests',
    'aiohttp',
    'curl/',
    'wget/',
    'postman',
    'go-http-client',
    'bytespider',
    'gptbot',
    'claudebot',
    'semrushbot',
    'ahrefsbot',
    'petalbot',
    'mj12bot',
    'dotbot',
  ];

  for (const pattern of botPatterns) {
    if (lowerUa.includes(pattern)) return true;
  }

  // Datacenters avec requêtes synthétiques (AWS, Google Cloud, DigitalOcean, Hetzner, etc.)
  if (isp) {
    const lowerIsp = isp.toLowerCase();
    if ((lowerIsp.includes('amazon') || lowerIsp.includes('aws')) && lowerUa.includes('chrome')) {
      return true;
    }
  }

  return false;
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
 * Résout la géolocalisation réelle et pointue à partir de l'IP, des en-têtes Edge et des coordonnées client
 */
export async function lookupGeoIp(
  ip: string,
  headers?: Headers | null,
  clientCoords?: { lat?: number; lon?: number; declaredLocation?: string }
): Promise<GeoLocation> {
  const clean = cleanIp(ip);

  // 1. Adresses locales / développement
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
      timezone: 'Africa/Porto-Novo',
      precision: 'ip',
      isLocal: true,
    };
  }

  // 2. Vérification des en-têtes Edge natifs de Vercel & Cloudflare (précision maximale et latence 0ms)
  let edgeCity = '';
  let edgeCountry = '';
  let edgeRegion = '';
  let edgeLat: number | null = null;
  let edgeLon: number | null = null;
  let edgeTimezone = '';
  let edgeAsNumber = '';

  if (headers) {
    const rawCity = headers.get('x-vercel-ip-city') || headers.get('cf-ipcity');
    if (rawCity) {
      try {
        edgeCity = decodeURIComponent(rawCity);
      } catch {
        edgeCity = rawCity;
      }
    }
    edgeCountry = headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || '';
    const rawReg = headers.get('x-vercel-ip-country-region') || headers.get('cf-region');
    if (rawReg) {
      edgeRegion = BENIN_REGIONS_MAP[rawReg.toUpperCase()] || rawReg;
    }
    const rawLat = headers.get('x-vercel-ip-latitude');
    const rawLon = headers.get('x-vercel-ip-longitude');
    if (rawLat && rawLon) {
      edgeLat = parseFloat(rawLat);
      edgeLon = parseFloat(rawLon);
    }
    edgeTimezone = headers.get('x-vercel-ip-timezone') || 'Africa/Porto-Novo';
    edgeAsNumber = headers.get('x-vercel-ip-as-number') || '';
  }

  // Coordonnées finales : priorité absolue aux coordonnées GPS client si fournies
  const finalLat = clientCoords?.lat != null ? clientCoords.lat : edgeLat;
  const finalLon = clientCoords?.lon != null ? clientCoords.lon : edgeLon;

  // Si on a les en-têtes Edge de Vercel ou Cloudflare
  if (edgeCity || edgeCountry || (edgeLat != null && edgeLon != null)) {
    const baseCity = edgeCity || 'Cotonou';
    const baseRegion = edgeRegion || 'Littoral';
    const countryName = edgeCountry === 'BJ' || edgeCountry === 'Benin' ? 'Bénin' : edgeCountry || 'Bénin';

    // Raffinement béninois par quartier/commune si coordonnées présentes
    const refined = refineBeninLocation(finalLat, finalLon, baseCity, baseRegion);
    const ispName = formatCarrierName('', '', '', edgeAsNumber);

    const result: GeoLocation = {
      ip: clean,
      city: clientCoords?.declaredLocation || refined.city,
      region: refined.region,
      country: countryName,
      countryCode: edgeCountry || 'BJ',
      isp: ispName,
      as: edgeAsNumber ? `AS${edgeAsNumber}` : undefined,
      latitude: finalLat,
      longitude: finalLon,
      timezone: edgeTimezone || 'Africa/Porto-Novo',
      precision: clientCoords?.lat != null ? 'gps' : (refined.precision === 'gps' ? 'gps' : 'edge'),
      isLocal: false,
    };

    geoCache.set(clean, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  // 3. Cache en mémoire
  const cached = geoCache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    // Si coordonnées client fournies et absentes du cache, mettre à jour le cache
    if (clientCoords?.lat != null && cached.data.latitude !== clientCoords.lat) {
      const refined = refineBeninLocation(clientCoords.lat, clientCoords.lon, cached.data.city, cached.data.region);
      cached.data.latitude = clientCoords.lat;
      cached.data.longitude = clientCoords.lon;
      cached.data.city = clientCoords?.declaredLocation || refined.city;
      cached.data.region = refined.region;
      cached.data.precision = 'gps';
    }
    return cached.data;
  }

  // 4. Résolution multi-fournisseurs HTTPS ultra-résiliente
  let resolvedData: Partial<GeoLocation> | null = null;

  // Tentative 1 : ipapi.co (très précis sur les opérateurs et les villes d'Afrique de l'Ouest)
  try {
    const ctrl1 = new AbortController();
    const t1 = setTimeout(() => ctrl1.abort(), 2000);
    const res1 = await fetch(`https://ipapi.co/${encodeURIComponent(clean)}/json/`, {
      signal: ctrl1.signal,
      headers: { 'User-Agent': 'AfrinovaShop/1.0' },
    });
    clearTimeout(t1);
    if (res1.ok) {
      const d = await res1.json();
      if (d.city || d.country_name) {
        resolvedData = {
          city: d.city || 'Cotonou',
          region: d.region || 'Littoral',
          country: d.country_name === 'Benin' ? 'Bénin' : d.country_name || 'Bénin',
          countryCode: d.country_code || 'BJ',
          isp: formatCarrierName(d.org, d.asn, d.org, d.asn),
          org: d.org || '',
          as: d.asn || '',
          latitude: typeof d.latitude === 'number' ? d.latitude : null,
          longitude: typeof d.longitude === 'number' ? d.longitude : null,
          timezone: d.timezone || 'Africa/Porto-Novo',
        };
      }
    }
  } catch {}

  // Tentative 2 (Fallback) : ip-api.com
  if (!resolvedData) {
    try {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 2000);
      const res2 = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query`,
        { signal: ctrl2.signal }
      );
      clearTimeout(t2);
      if (res2.ok) {
        const d = await res2.json();
        if (d.status === 'success') {
          resolvedData = {
            city: d.city || 'Cotonou',
            region: d.regionName || 'Littoral',
            country: d.country === 'Benin' ? 'Bénin' : d.country || 'Bénin',
            countryCode: d.countryCode || 'BJ',
            isp: formatCarrierName(d.isp, d.org, d.as),
            org: d.org || '',
            as: d.as || '',
            latitude: typeof d.lat === 'number' ? d.lat : null,
            longitude: typeof d.lon === 'number' ? d.lon : null,
            timezone: d.timezone || 'Africa/Porto-Novo',
          };
        }
      }
    } catch {}
  }

  // Tentative 3 (Fallback) : freeipapi.com
  if (!resolvedData) {
    try {
      const ctrl3 = new AbortController();
      const t3 = setTimeout(() => ctrl3.abort(), 2000);
      const res3 = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(clean)}`, {
        signal: ctrl3.signal,
      });
      clearTimeout(t3);
      if (res3.ok) {
        const d = await res3.json();
        if (d.cityName || d.countryName) {
          resolvedData = {
            city: d.cityName || 'Cotonou',
            region: d.regionName || 'Littoral',
            country: d.countryName === 'Benin' ? 'Bénin' : d.countryName || 'Bénin',
            countryCode: d.countryCode || 'BJ',
            isp: formatCarrierName(d.asn, '', d.asn),
            latitude: typeof d.latitude === 'number' ? d.latitude : null,
            longitude: typeof d.longitude === 'number' ? d.longitude : null,
            timezone: d.timeZone || 'Africa/Porto-Novo',
          };
        }
      }
    } catch {}
  }

  // Application des coordonnées finales et du raffinement par quartier
  const usedLat = finalLat != null ? finalLat : resolvedData?.latitude || null;
  const usedLon = finalLon != null ? finalLon : resolvedData?.longitude || null;
  const baseCity = resolvedData?.city || 'Cotonou';
  const baseRegion = resolvedData?.region || 'Littoral';
  const refined = refineBeninLocation(usedLat, usedLon, baseCity, baseRegion);

  const result: GeoLocation = {
    ip: clean,
    city: clientCoords?.declaredLocation || refined.city,
    region: refined.region,
    country: resolvedData?.country || 'Bénin',
    countryCode: resolvedData?.countryCode || 'BJ',
    isp: resolvedData?.isp || 'Celtiis / SBIN',
    org: resolvedData?.org,
    as: resolvedData?.as,
    latitude: usedLat,
    longitude: usedLon,
    timezone: resolvedData?.timezone || 'Africa/Porto-Novo',
    precision: clientCoords?.lat != null ? 'gps' : (usedLat != null ? 'gps' : 'ip'),
    isLocal: false,
  };

  geoCache.set(clean, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
