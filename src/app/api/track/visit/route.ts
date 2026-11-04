import { NextRequest, NextResponse } from 'next/server';
import { recordPageView } from '@/lib/db';
import { isTursoEnabled, tursoRecordPageView } from '@/lib/turso';
import { extractClientIp, lookupGeoIp, parseUserAgent, isPrivateOrLocalIp } from '@/lib/geoip';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      sessionId,
      path,
      title,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      clientPublicIp,
      clientLat,
      clientLon,
      isHeartbeat,
    } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ ok: false, error: 'sessionId requis' }, { status: 400 });
    }

    // 1. Détection de l'adresse IP réelle
    let ip = extractClientIp(request.headers);
    // Si l'IP reçue est locale/bouclage et que le client a détecté son IP publique, on utilise l'IP publique
    if (isPrivateOrLocalIp(ip) && clientPublicIp && typeof clientPublicIp === 'string' && !isPrivateOrLocalIp(clientPublicIp)) {
      ip = clientPublicIp.trim();
    }

    // 2. Détection du terminal et navigateur via le User-Agent réel
    const rawUa = request.headers.get('user-agent') || '';
    const uaInfo = parseUserAgent(rawUa);

    // 3. Résolution de la géolocalisation réelle (Ville, Région, Pays, FAI/Opérateur, Coordonnées)
    const geo = await lookupGeoIp(ip);

    // 4. Enregistrement en base de données SQLite ou Turso
    const visitData = {
      sessionId,
      path: typeof path === 'string' ? path : '/',
      title: typeof title === 'string' ? title : '',
      referrer: typeof referrer === 'string' ? referrer : '',
      utm_source: typeof utm_source === 'string' ? utm_source : '',
      utm_medium: typeof utm_medium === 'string' ? utm_medium : '',
      utm_campaign: typeof utm_campaign === 'string' ? utm_campaign : '',
      device_type: uaInfo.device,
      ip_address: geo.ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      isp: geo.isp,
      latitude: typeof clientLat === 'number' ? clientLat : geo.latitude,
      longitude: typeof clientLon === 'number' ? clientLon : geo.longitude,
      user_agent: rawUa.slice(0, 300),
      browser: uaInfo.browser,
      isHeartbeat: Boolean(isHeartbeat),
    };

    if (isTursoEnabled()) {
      await tursoRecordPageView(visitData);
    } else {
      recordPageView(visitData);
    }

    return NextResponse.json({
      ok: true,
      ip: geo.ip,
      city: geo.city,
      region: geo.region,
      isp: geo.isp,
      device: uaInfo.device,
      browser: uaInfo.browser,
    });
  } catch (err) {
    console.error('Erreur API track visit:', err);
    return NextResponse.json({ ok: false, error: 'Erreur interne' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', tracking: 'active' });
}
