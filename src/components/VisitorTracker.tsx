'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
  const pathname = usePathname();
  const sessionRef = useRef<string>('');
  const publicIpRef = useRef<string>('');

  useEffect(() => {
    // Détection de l'IP publique en tâche de fond pour enrichir les requêtes de test local
    try {
      const cachedIp = sessionStorage.getItem('atelier_public_ip');
      if (cachedIp) {
        publicIpRef.current = cachedIp;
      } else {
        fetch('https://api.ipify.org?format=json')
          .then((r) => r.json())
          .then((data) => {
            if (data?.ip) {
              publicIpRef.current = data.ip;
              sessionStorage.setItem('atelier_public_ip', data.ip);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Ne pas tracer les pages administratives ou les routes d'API
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return;
    }

    // Récupération ou initialisation de l'identifiant de session
    let sId = '';
    try {
      sId = sessionStorage.getItem('atelier_session_id') || '';
      if (!sId) {
        sId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        sessionStorage.setItem('atelier_session_id', sId);
      }
    } catch {
      sId = 'sess_anon_' + Date.now().toString(36);
    }
    sessionRef.current = sId;

    // Extraction des paramètres UTM dans l'URL si présents
    let utmSource = '';
    let utmMedium = '';
    let utmCampaign = '';
    try {
      const params = new URLSearchParams(window.location.search);
      utmSource = params.get('utm_source') || '';
      utmMedium = params.get('utm_medium') || '';
      utmCampaign = params.get('utm_campaign') || '';
    } catch {}

    // Envoi du ping de visite de la page
    const sendVisit = (isHeartbeat = false) => {
      fetch('/api/track/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sId,
          path: pathname,
          title: typeof document !== 'undefined' ? document.title : '',
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          clientPublicIp: publicIpRef.current || undefined,
          isHeartbeat,
        }),
      }).catch(() => {});
    };

    sendVisit(false);

    // Heartbeat régulier toutes les 25 secondes tant que la page est ouverte
    const interval = setInterval(() => {
      sendVisit(true);
    }, 25000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
