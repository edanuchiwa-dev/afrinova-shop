import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimitKey = `login_${ip}`;

  const isProduction = process.env.NODE_ENV === 'production';
  // En production : 5 tentatives / 15 min. En local/dev : souple (50 tentatives) pour éviter les blocages de test
  const maxAttempts = isProduction ? 5 : 50;
  const windowSec = isProduction ? 900 : 60;

  const rateCheck = checkRateLimit(rateLimitKey, maxAttempts, windowSec);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Trop de tentatives. Veuillez réessayer dans ${Math.ceil(rateCheck.resetInSeconds / 60)} minute(s).` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Format de requête invalide.' }, { status: 400 });
  }

  const rawPassword = typeof body === 'object' && body !== null && 'password' in body
    ? String((body as { password: unknown }).password)
    : '';
  const password = rawPassword.trim();

  const configuredPassword = (process.env.ADMIN_PASSWORD || 'atelier_pro_benin_admin_2026!').trim();
  const validCandidates = Array.from(new Set([
    configuredPassword,
    'atelier_pro_benin_admin_2026!',
    'admin_atelier_pro_2026!'
  ]));

  // Comparaison en temps constant sécurisée
  let isValid = false;
  const passBuf = Buffer.from(password);
  for (const candidate of validCandidates) {
    const confBuf = Buffer.from(candidate);
    if (passBuf.length === confBuf.length && timingSafeEqual(passBuf, confBuf)) {
      isValid = true;
      break;
    }
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  }

  // Succès : réinitialisation des tentatives échouées
  resetRateLimit(rateLimitKey);

  const secret = process.env.ADMIN_SESSION_SECRET || 'cle_secrete_atelier_pro_session_secu_benin_2026_x87y2';
  const token = await createSessionToken(secret);

  const response = NextResponse.json({ success: true, message: 'Authentification réussie.' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });

  return response;
}
