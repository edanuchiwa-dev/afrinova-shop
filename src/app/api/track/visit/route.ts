import { NextRequest, NextResponse } from 'next/server';
import { recordPageView } from '@/lib/db';
import { isTursoEnabled, tursoRecordPageView } from '@/lib/turso';
import { extractClientIp, lookupGeoIp, parseUserAgent, isPrivateOrLocalIp, isBotOrCrawler } from '@/lib/geoip';

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
      clientDeclaredLocation,
      isHeartbeat,
    } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ ok: false, error: 'sessionId requis' }, { status: 400 });
    }

    // 0. Filtrage immédiat des robots, crawlers et navigateurs headless
    const rawUa = request.headers.get('user-agent') || '';
    if (isBotOrCrawler(rawUa)) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'bot_ignored' });
    }

    // 1. Détection de l'adresse IP réelle
    let ip = extractClientIp(request.headers);
    // Si l'IP reçue est locale/bouclage et que le client a détecté son IP publique, on utilise l'IP publique
    if (isPrivateOrLocalIp(ip) && clientPublicIp && typeof clientPublicIp === 'string' && !isPrivateOrLocalIp(clientPublicIp)) {
      ip = clientPublicIp.trim();
    }

    // 2. Détection du terminal et navigateur via le User-Agent réel
    const uaInfo = parseUserAgent(rawUa);

    // 3. Résolution de la géolocalisation haute précision (En-têtes Edge Vercel/Cloudflare, GPS client, multi-fournisseurs)
    const clientCoords = {
      lat: typeof clientLat === 'number' && !isNaN(clientLat) ? clientLat : undefined,
      lon: typeof clientLon === 'number' && !isNaN(clientLon) ? clientLon : undefined,
      declaredLocation: typeof clientDeclaredLocation === 'string' && clientDeclaredLocation.trim() ? clientDeclaredLocation.trim() : undefined,
    };
    const geo = await lookupGeoIp(ip, request.headers, clientCoords);

    // Filtrage secondaire : si le FAI ou l'ISP est un datacenter crawler (ex: AWS avec UA générique)
    if (isBotOrCrawler(rawUa, geo.isp)) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'datacenter_bot_ignored' });
    }

    // En environnement cloud (Turso), ne jamais enregistrer les tests locaux localhost / 127.0.0.1
    if (isTursoEnabled() && (isPrivateOrLocalIp(ip) || geo.isLocal || (referrer && typeof referrer === 'string' && referrer.includes('localhost')))) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'localhost_ignored' });
    }

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
      latitude: geo.latitude,
      longitude: geo.longitude,
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
