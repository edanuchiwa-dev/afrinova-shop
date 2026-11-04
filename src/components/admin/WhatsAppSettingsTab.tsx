'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Phone,
  Key,
  Globe,
  RotateCcw,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface WhatsAppConfig {
  enabled: boolean;
  phone: string;
  provider: 'callmebot' | 'greenapi' | 'webhook';
  apiKey: string;
  idInstance?: string;
  webhookUrl: string;
  template: string;
  defaultTemplate?: string;
  lastStatus?: string;
  lastSentAt?: string;
}

const AVAILABLE_VARIABLES = [
  { tag: '{order_number}', label: 'N° Commande', desc: 'Ex: CMD-2026-X8F3' },
  { tag: '{customer_name}', label: 'Nom Client', desc: 'Ex: Aimé Dossou' },
  { tag: '{customer_phone}', label: 'Tél Client', desc: 'Ex: +229 01 97 00 11 22' },
  { tag: '{shipping_city}', label: 'Ville', desc: 'Ex: Cotonou' },
  { tag: '{neighborhood}', label: 'Quartier', desc: 'Ex: Cadjehoun' },
  { tag: '{landmark}', label: 'Repère', desc: 'Ex: Face Pharmacie' },
  { tag: '{items}', label: 'Articles (Détaillés)', desc: 'Ex: • 1x Montre (35 000 FCFA)' },
  { tag: '{items_simple}', label: 'Articles (Ligne)', desc: 'Ex: 1x Montre, 2x Bracelets' },
  { tag: '{total_price}', label: 'Total TTC (FCFA)', desc: 'Ex: 36 000' },
  { tag: '{shipping_cost}', label: 'Frais Port (FCFA)', desc: 'Ex: 1 000' },
  { tag: '{payment_method}', label: 'Paiement', desc: 'Ex: Espèces à la livraison' },
  { tag: '{notes}', label: 'Notes Client', desc: 'Instructions particulières' },
  { tag: '{date}', label: 'Date & Heure', desc: 'Ex: 03/11/2026 à 17:30' },
  { tag: '{admin_url}', label: 'Lien Admin', desc: 'Lien direct vers la commande' },
];

export default function WhatsAppSettingsTab({
  showToast,
}: {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: true,
    phone: '2290197000000',
    provider: 'greenapi',
    apiKey: '',
    idInstance: '',
    webhookUrl: '',
    template: '',
    defaultTemplate: '',
    lastStatus: '',
    lastSentAt: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: string;
    directUrl?: string;
  } | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/whatsapp');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        showToast('Impossible de charger les paramètres WhatsApp.', 'error');
      }
    } catch {
      showToast('Erreur de connexion serveur.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig((prev) => ({ ...prev, ...data.config }));
        showToast('Configuration WhatsApp enregistrée avec succès !', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Erreur lors de l'enregistrement.", 'error');
      }
    } catch {
      showToast('Erreur réseau lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.phone.trim()) {
      showToast('Veuillez renseigner un numéro WhatsApp destinataire.', 'error');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        showToast('Message test WhatsApp envoyé avec succès !', 'success');
      } else {
        showToast(data.status || "Échec de l'envoi du message test.", 'error');
      }
    } catch {
      showToast("Erreur lors de l'envoi du message test.", 'error');
    } finally {
      setTesting(false);
    }
  };

  const insertVariable = (tag: string) => {
    setConfig((prev) => ({
      ...prev,
      template: `${prev.template} ${tag} `,
    }));
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const resetToDefaultTemplate = () => {
    if (config.defaultTemplate) {
      setConfig((prev) => ({ ...prev, template: prev.defaultTemplate || '' }));
      showToast('Message réinitialisé avec le modèle recommandé.', 'info');
    }
  };

  // Aperçu dynamique du message rendu avec des données factices
  const renderLivePreview = () => {
    const tmpl = config.template || config.defaultTemplate || '';
    return tmpl
      .replace(/{order_number}/g, 'CMD-2026-X8F3')
      .replace(/{customer_name}/g, 'Aimé Dossou')
      .replace(/{customer_phone}/g, '+229 01 97 00 12 34')
      .replace(/{shipping_city}/g, 'Cotonou')
      .replace(/{neighborhood}/g, 'Quartier Cadjehoun')
      .replace(/{landmark}/g, '(Repère: Face Pharmacie Concorde)')
      .replace(
        /{items}/g,
        '• 1x Montre Chronographe Prestige (35 000 FCFA)\n• 1x Bracelet Cuir Supp. (5 000 FCFA)'
      )
      .replace(/{items_simple}/g, '1x Montre Chronographe, 1x Bracelet')
      .replace(/{total_price}/g, '41 000')
      .replace(/{shipping_cost}/g, '1 000')
      .replace(/{subtotal}/g, '40 000')
      .replace(/{payment_method}/g, 'Paiement en espèces à la livraison')
      .replace(/{notes}/g, 'Merci d’appeler 30 minutes avant votre arrivée.')
      .replace(/{date}/g, 'Aujourd’hui à 17:35')
      .replace(/{admin_url}/g, 'http://localhost:3000/admin?search=CMD-2026-X8F3');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
        <p className="text-slate-500 font-medium text-sm">Chargement du module WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BANNIÈRE D'EN-TÊTE AVEC TOGGLE PRINCIPAL */}
      <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-500/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Système de Notification WhatsApp Instantané</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              Alertes de Commande en Direct sur WhatsApp
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Recevez automatiquement sur votre smartphone un message WhatsApp sur-mesure contenant tous les détails
              du client, le récapitulatif des articles et le montant exact à encaisser dès qu&apos;une commande est passée.
            </p>
          </div>

          {/* Toggle d'activation principal */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
            <div>
              <div className="text-xs font-bold text-white">Notifications WhatsApp</div>
              <div className="text-[11px] text-slate-300">
                {config.enabled ? '🟢 Actives sur chaque commande' : '⚪ Désactivées'}
              </div>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                config.enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dernier statut d'envoi */}
        {config.lastStatus && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-semibold text-white">Dernier envoi :</span>
              <span className="text-emerald-300 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {config.lastStatus}
              </span>
            </div>
            {config.lastSentAt && (
              <span className="text-slate-400 text-[11px]">
                {new Date(config.lastSentAt).toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* GRILLE 2 COLONNES : PARAMÈTRES TECHNIQUES & MODÈLE DE MESSAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNE GAUCHE (7 cols) : Configuration du Destinataire & Passerelle */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CARTE 1 : DESTINATAIRE & FOURNISSEUR */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Phone className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Numéro WhatsApp Récepteur</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Votre Numéro WhatsApp (où vous recevez les alertes)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                  🇧🇯 +229
                </div>
                <input
                  type="text"
                  value={config.phone}
                  onChange={(e) => setConfig((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="01 97 XX XX XX ou 2290197000000"
                  className="w-full pl-20 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Format national (ex: <code>01 97 00 00 00</code>) ou international avec indicatif (ex: <code>2290197000000</code>).
              </p>
            </div>

            {/* CHOIX DU MODE D'ENVOI */}
            <div className="pt-3">
              <label className="block text-xs font-bold text-slate-700 mb-2.5">
                Mode d&apos;envoi des alertes WhatsApp
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Carte Green-API (Recommandée) */}
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, provider: 'greenapi' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                    config.provider === 'greenapi'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      GREEN-API
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recommandé
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    100% Gratuit (Plan Développeur). Aucune saturation de bot, lié à votre propre WhatsApp.
                  </p>
                </button>

                {/* Carte CallMeBot */}
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, provider: 'callmebot' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                    config.provider === 'callmebot'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                      CallMeBot
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Saturé
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Bot public gratuit (peut afficher &quot;Bot is full&quot; selon les quotas Meta).
                  </p>
                </button>

                {/* Carte Webhook Custom */}
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, provider: 'webhook' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                    config.provider === 'webhook'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      Webhook Custom
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      n8n / Make
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Pour intégrations personnalisées via requêtes HTTP POST JSON.
                  </p>
                </button>
              </div>
            </div>

            {/* DÉTAILS SPÉCIFIQUES SELON LE PROVIDER */}
            {config.provider === 'greenapi' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      IdInstance Green-API
                    </label>
                    <input
                      type="text"
                      value={config.idInstance || ''}
                      onChange={(e) => setConfig((prev) => ({ ...prev, idInstance: e.target.value }))}
                      placeholder="Ex: 1101999999"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      ApiTokenInstance Green-API
                    </label>
                    <input
                      type="text"
                      value={config.apiKey}
                      onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Ex: 5d8a9...b4c"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                    />
                  </div>
                </div>

                {/* Instructions d'activation Green-API en 3 étapes */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>⚡ Activation en 1 minute (Plan Developer 100% Gratuit) :</span>
                    <a
                      href="https://green-api.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>green-api.com</span> <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>Inscrivez-vous gratuitement sur <strong>green-api.com</strong> et créez une instance gratuite.</li>
                    <li>Scannez le QR Code affiché avec votre WhatsApp (Menu &gt; <em>Appareils connectés</em>).</li>
                    <li>Copiez l&apos;<strong>IdInstance</strong> et l&apos;<strong>ApiTokenInstance</strong> ci-dessus !</li>
                  </ol>
                </div>
              </div>
            )}

            {config.provider === 'callmebot' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <label className="block font-bold text-slate-800 mb-1">
                      Clé API CallMeBot (apikey)
                    </label>
                    <input
                      type="text"
                      value={config.apiKey}
                      onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Ex: 1234567"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                    />
                  </div>
                </div>

                {/* Instructions d'activation express en 3 étapes */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>⚡ Comment obtenir votre clé CallMeBot :</span>
                  </div>
                  <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 text-[11px]">
                    ⚠️ Le numéro actuel de CallMeBot est temporairement saturé par Meta (&quot;This Bot is full&quot;).
                    Le créateur ajoutera de nouveaux numéros sous peu. En attendant, privilégiez <strong>GREEN-API</strong> ou le bouton direct WhatsApp ci-dessous.
                  </p>
                </div>
              </div>
            )}

            {config.provider === 'webhook' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    URL du Webhook (Requête HTTP POST)
                  </label>
                  <input
                    type="url"
                    value={config.webhookUrl}
                    onChange={(e) => setConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="https://votre-serveur.com/api/webhook/whatsapp"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Bearer Token / Clé d&apos;authentification (Optionnel)
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CARTE 2 : ÉDITEUR DU MESSAGE SUR-MESURE */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Modèle de Message Sur-Mesure</h3>
              </div>
              <button
                type="button"
                onClick={resetToDefaultTemplate}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition cursor-pointer"
                title="Rétablir le modèle par défaut"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rétablir par défaut</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Personnalisez exactement le texte qui vous sera envoyé sur WhatsApp. Cliquez sur une variable ci-dessous
              pour l&apos;insérer dans votre modèle.
            </p>

            {/* Puces de variables insérables */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-mono font-bold text-slate-700 transition cursor-pointer shadow-2xs group"
                  title={`${v.label} — ${v.desc}`}
                >
                  <span>{v.tag}</span>
                  {copiedTag === v.tag ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Zone de saisie du texte */}
            <div>
              <textarea
                rows={11}
                value={config.template}
                onChange={(e) => setConfig((prev) => ({ ...prev, template: e.target.value }))}
                className="w-full p-4 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition leading-relaxed"
                placeholder="Rédigez votre modèle de message ici..."
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Mise en forme WhatsApp supportée : <code>*gras*</code>, <code>_italique_</code>, emojis</span>
                <span>{config.template.length} caractères</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (5 cols) : Aperçu WhatsApp en Direct & Boutons d'Action */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* APERÇU EN DIRECT DU MESSAGE (Style Smartphone WhatsApp) */}
          <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border-4 border-slate-800">
            {/* Barre de statut smartphone */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 py-1 mb-2 font-mono">
              <span>17:35</span>
              <span>WhatsApp • 4G</span>
              <span>100%</span>
            </div>

            {/* Header de la discussion */}
            <div className="bg-emerald-800 text-white p-3 rounded-2xl flex items-center gap-3 mb-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                🏬
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">AFRINOVA SHOP — Commandes</div>
                <div className="text-[10px] text-emerald-200">En ligne • Bot Officiel</div>
              </div>
            </div>

            {/* Écran de chat avec la bulle WhatsApp */}
            <div className="bg-[#EFEAE2] rounded-2xl p-3 min-h-[360px] flex flex-col justify-end relative shadow-inner">
              <div className="bg-[#DCF8C6] text-slate-900 rounded-2xl rounded-tr-xs p-3.5 shadow-sm text-xs space-y-1.5 border border-[#c1e7a5] max-w-full">
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed break-words">
                  {renderLivePreview()}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-1">
                  <span>17:35</span>
                  <span className="text-blue-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS : TEST EN DIRECT & SAUVEGARDE */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Actions & Vérification</h4>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${testing ? 'animate-bounce' : ''}`} />
                <span>{testing ? 'Envoi du test en cours...' : 'Envoyer un message test WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer la configuration'}</span>
              </button>
            </div>

            {/* RÉSULTAT DU DERNIER TEST */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 font-semibold leading-relaxed">
                    {testResult.status}
                  </div>
                </div>

                {testResult.directUrl && (
                  <a
                    href={testResult.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:underline pt-1"
                  >
                    <span>Ouvrir la conversation sur WhatsApp Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* AVERTISSEMENT SI CLÉ MANQUANTE */}
            {config.provider === 'callmebot' && !config.apiKey && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Clé API non configurée :</strong> Pour que les messages soient envoyés automatiquement sans intervention,
                  ajoutez votre clé CallMeBot gratuite.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
