'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
  const pathname = usePathname();
  const sessionRef = useRef<string>('');
  const publicIpRef = useRef<string>('');
  const coordsRef = useRef<{ lat?: number; lon?: number }>({});

  useEffect(() => {
    // 1. Détection de l'IP publique en tâche de fond pour enrichir les requêtes de test local
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

    // 2. Détection GPS haute précision si déjà autorisée par le client
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator && 'permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' }).then((status) => {
          if (status.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (pos?.coords) {
                  coordsRef.current = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                  };
                }
              },
              () => {},
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 120000 }
            );
          }
        }).catch(() => {});
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

    // Envoi du ping de visite avec géolocalisation pointue
    const sendVisit = (isHeartbeat = false) => {
      let clientDeclaredLocation = '';
      try {
        clientDeclaredLocation = sessionStorage.getItem('atelier_customer_location') || '';
      } catch {}

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
          clientLat: coordsRef.current.lat,
          clientLon: coordsRef.current.lon,
          clientDeclaredLocation: clientDeclaredLocation || undefined,
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
