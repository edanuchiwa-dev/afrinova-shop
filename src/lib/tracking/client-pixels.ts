'use client';

/**
 * Gestionnaire client des Pixels Meta et TikTok conditionnés au consentement utilisateur.
 * Ne charge AUCUN script tiers tant que l'utilisateur n'a pas expressément consenti.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    ttq?: {
      load: (id: string) => void;
      page: () => void;
      track: (event: string, params?: Record<string, unknown>) => void;
      [key: string]: unknown;
    };
  }
}

const CONSENT_STORAGE_KEY = 'atelier_cookie_consent';

export function hasTrackingConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted';
}

export function setTrackingConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_STORAGE_KEY, granted ? 'granted' : 'denied');
  if (granted) {
    initPixelsIfConsented();
    window.dispatchEvent(new CustomEvent('atelier:consent_changed', { detail: { granted: true } }));
  }
}

export function initPixelsIfConsented(): void {
  if (typeof window === 'undefined' || !hasTrackingConsent()) return;

  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  // 1. Initialisation Meta Pixel
  if (metaPixelId && !window.fbq) {
    const f: any = (window.fbq = function (...args: unknown[]) {
      if (f.callMethod) {
        f.callMethod.apply(f, args);
      } else {
        f.queue.push(args);
      }
    });
    f.push = f;
    f.loaded = true;
    f.version = '2.0';
    f.queue = [];
    const t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    const s = document.getElementsByTagName('script')[0];
    s?.parentNode?.insertBefore(t, s);

    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
  }

  // 2. Initialisation TikTok Pixel
  if (tiktokPixelId && !(window as any).ttq) {
    const win = window as any;
    const ttq: any = (win.ttq = win.ttq || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    const t = document.createElement('script');
    t.type = 'text/javascript';
    t.async = true;
    t.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${tiktokPixelId}&lib=ttq`;
    const s = document.getElementsByTagName('script')[0];
    s?.parentNode?.insertBefore(t, s);

    ttq.load(tiktokPixelId);
    ttq.page();
  }
}

export function trackPixelViewContent(item: { id: number; name: string; price: number }): void {
  if (!hasTrackingConsent()) return;

  if (window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_name: item.name,
      content_ids: [String(item.id)],
      content_type: 'product',
      value: item.price,
      currency: 'XOF',
    });
  }

  if (window.ttq) {
    window.ttq.track('ViewContent', {
      content_name: item.name,
      content_id: String(item.id),
      content_type: 'product',
      value: item.price,
      currency: 'XOF',
    });
  }
}

export function trackPixelPurchase(order: { orderNumber: string; value: number }): void {
  if (!hasTrackingConsent()) return;

  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value: order.value,
      currency: 'XOF',
      order_id: order.orderNumber,
    });
  }

  if (window.ttq) {
    window.ttq.track('CompletePayment', {
      value: order.value,
      currency: 'XOF',
      order_id: order.orderNumber,
    });
  }
}
