import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Autoriser l'accès libre à la page de connexion et à l'API de login
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  // Vérification de la session
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev_secret_key_change_in_production_123456789';
  const isAuthenticated = await verifySessionToken(sessionToken, secret);

  if (!isAuthenticated) {
    // Si c'est une requête API : 401 Unauthorized
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Si c'est une page d'administration : redirection vers la page de connexion
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
