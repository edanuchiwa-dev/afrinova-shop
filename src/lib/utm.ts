/**
 * Capture et persistance des paramètres UTM et Referrer
 * Stockés dans sessionStorage pour survivre à la navigation entre les pages.
 */

export type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  referrer: string;
};

export function captureUtmParams(): UtmParams {
  if (typeof window === 'undefined') {
    return { utm_source: '', utm_medium: '', utm_campaign: '', referrer: '' };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const currentReferrer = document.referrer || '';

  // Récupération des tags UTM depuis l'URL actuelle
  const urlSource = urlParams.get('utm_source') || '';
  const urlMedium = urlParams.get('utm_medium') || '';
  const urlCampaign = urlParams.get('utm_campaign') || '';

  // Récupération de l'état déjà enregistré dans la session
  const savedSource = sessionStorage.getItem('atelier_utm_source') || '';
  const savedMedium = sessionStorage.getItem('atelier_utm_medium') || '';
  const savedCampaign = sessionStorage.getItem('atelier_utm_campaign') || '';
  const savedReferrer = sessionStorage.getItem('atelier_referrer') || '';

  const utm_source = urlSource || savedSource;
  const utm_medium = urlMedium || savedMedium;
  const utm_campaign = urlCampaign || savedCampaign;
  const referrer = currentReferrer || savedReferrer;

  // Sauvegarde si non vide
  if (utm_source) sessionStorage.setItem('atelier_utm_source', utm_source);
  if (utm_medium) sessionStorage.setItem('atelier_utm_medium', utm_medium);
  if (utm_campaign) sessionStorage.setItem('atelier_utm_campaign', utm_campaign);
  if (referrer) sessionStorage.setItem('atelier_referrer', referrer);

  return { utm_source, utm_medium, utm_campaign, referrer };
}
