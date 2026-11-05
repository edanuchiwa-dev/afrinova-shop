'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Search,
  Eye,
  Tag,
  ChevronDown,
  Info,
  ExternalLink,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Globe,
  Sparkles,
  Layers,
  Box,
  Truck,
  Copy,
  AlertCircle,
  HelpCircle,
  X,
  Star,
  MoveLeft,
  MoveRight,
  Code,
  Loader2
} from 'lucide-react';
import { formatFCFA } from '@/lib/format';
import BundleSelector from '@/components/BundleSelector';
import { getBundles } from '@/lib/bundles';

export type ProductData = {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  price: number | string;
  compare_at_price?: number | string | null;
  cost_per_item?: number | string | null;
  stock: number | string;
  sku?: string;
  barcode?: string;
  track_quantity?: boolean | number;
  continue_selling_out_of_stock?: boolean | number;
  category: string;
  image_url?: string | null;
  media_urls?: string[] | string;
  weight_kg?: number | string;
  is_physical?: boolean | number;
  vendor?: string;
  tags?: string[] | string;
  seo_title?: string;
  seo_description?: string;
  variants?: Array<{
    id?: string;
    title: string;
    price: number | string;
    stock: number | string;
    sku: string;
  }> | string;
  sales_channels?: string[] | string;
  bundle_style?: 'pill' | 'card' | string;
  bundle_accent_color?: string | null;
  status: 'active' | 'draft' | 'archived';
};

interface ShopifyProductFormProps {
  initialData?: ProductData | null;
  isEdit?: boolean;
}

const PRESET_MEDIA = [
  { label: 'Montre Luxe', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1000&q=80' },
  { label: 'Sacoche Cuir', url: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=1000&q=80' },
  { label: 'Casque Audio', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&q=80' },
  { label: 'Portefeuille RFID', url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=1000&q=80' },
  { label: 'Sneakers Mode', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&q=80' },
  { label: 'Lunettes Soleil', url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1000&q=80' },
];

const CATEGORY_SUGGESTIONS = [
  'Maroquinerie',
  'Montres',
  'Audio & Tech',
  'Chaussures',
  'Mode & Vêtements',
  'Accessoires',
  'Bijoux'
];

export default function ShopifyProductForm({ initialData, isEdit = false }: ShopifyProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Données de base
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [htmlMode, setHtmlMode] = useState(false);

  // Médias
  const [mediaList, setMediaList] = useState<string[]>(() => {
    if (Array.isArray(initialData?.media_urls)) return initialData.media_urls;
    if (typeof initialData?.media_urls === 'string' && initialData.media_urls.trim()) {
      try {
        const parsed = JSON.parse(initialData.media_urls);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [initialData.media_urls];
      }
    }
    if (initialData?.image_url) return [initialData.image_url];
    return [];
  });
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Tarification
  const [price, setPrice] = useState<string>(initialData?.price ? String(initialData.price) : '');
  const [comparePrice, setComparePrice] = useState<string>(
    initialData?.compare_at_price ? String(initialData.compare_at_price) : ''
  );
  const [chargeTax, setChargeTax] = useState(true);
  const [costPerItem, setCostPerItem] = useState<string>(
    initialData?.cost_per_item ? String(initialData.cost_per_item) : ''
  );

  // Inventaire & Logistique
  const [trackQuantity, setTrackQuantity] = useState<boolean>(
    initialData?.track_quantity !== undefined ? Boolean(initialData.track_quantity) : true
  );
  const [stock, setStock] = useState<string>(initialData?.stock !== undefined ? String(initialData.stock) : '10');
  const [sku, setSku] = useState(initialData?.sku || '');
  const [barcode, setBarcode] = useState(initialData?.barcode || '');
  const [continueSelling, setContinueSelling] = useState<boolean>(
    initialData?.continue_selling_out_of_stock ? Boolean(initialData.continue_selling_out_of_stock) : false
  );

  // Expédition
  const [isPhysical, setIsPhysical] = useState<boolean>(
    initialData?.is_physical !== undefined ? Boolean(initialData.is_physical) : true
  );
  const [weightKg, setWeightKg] = useState<string>(initialData?.weight_kg ? String(initialData.weight_kg) : '0.5');

  // Variantes
  const [hasVariants, setHasVariants] = useState<boolean>(() => {
    if (!initialData?.variants) return false;
    try {
      const v = typeof initialData.variants === 'string' ? JSON.parse(initialData.variants) : initialData.variants;
      return Array.isArray(v) && v.length > 0;
    } catch {
      return false;
    }
  });

  const [options, setOptions] = useState<Array<{ name: string; values: string[] }>>([
    { name: 'Taille', values: ['S', 'M', 'L'] },
  ]);
  const [newOptionValue, setNewOptionValue] = useState<Record<number, string>>({});

  // SEO
  const [showSeoEdit, setShowSeoEdit] = useState(false);
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seo_description || '');
  const [customSlug, setCustomSlug] = useState(initialData?.slug || '');

  // Colonne latérale
  const [bundleStyle, setBundleStyle] = useState<'card' | 'pill' | 'grid' | 'compact' | 'badge_stack'>(
    (initialData?.bundle_style as any) || 'card'
  );
  const [bundleAccentColor, setBundleAccentColor] = useState<string>(
    initialData?.bundle_accent_color || '#C27835'
  );
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(initialData?.status || 'active');
  const [category, setCategory] = useState(initialData?.category || 'Maroquinerie');
  const [vendor, setVendor] = useState(initialData?.vendor || 'AFRINOVA SHOP');
  const [tags, setTags] = useState<string[]>(() => {
    if (Array.isArray(initialData?.tags)) return initialData.tags;
    if (typeof initialData?.tags === 'string' && initialData.tags.trim()) {
      return initialData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    return ['Boutique', 'Nouveauté'];
  });
  const [tagInput, setTagInput] = useState('');
  const [salesChannels, setSalesChannels] = useState<{ online: boolean; whatsapp: boolean; ads: boolean }>({
    online: true,
    whatsapp: true,
    ads: true,
  });

  // UI States
  const [saving, setSaving] = useState(false);
  const [previewSelectedBundleId, setPreviewSelectedBundleId] = useState<string>('x1');

  // Calcul dynamique des offres pour l'aperçu en direct du bundle
  const previewBundles = useMemo(() => {
    const numPrice = Number(price) || 15000;
    return getBundles({
      price: numPrice,
      image_url: mediaList[0] || null,
      slug: customSlug || 'produit',
    });
  }, [price, mediaList, customSlug]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-fill SEO Title & Slug si non personnalisé
  useEffect(() => {
    if (!customSlug && name) {
      const slugCandidate = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setCustomSlug(slugCandidate);
    }
  }, [name, customSlug]);

  // Calcul automatique de la marge & bénéfice Shopify
  const marginStats = useMemo(() => {
    const numPrice = Number(price);
    const numCost = Number(costPerItem);
    if (!numPrice || numPrice <= 0 || !numCost || numCost <= 0) {
      return { margin: null, profit: null };
    }
    const profit = numPrice - numCost;
    const margin = Math.round((profit / numPrice) * 100);
    return { margin, profit };
  }, [price, costPerItem]);

  // Calcul du pourcentage de réduction si prix comparé
  const compareDiscount = useMemo(() => {
    const p = Number(price);
    const cp = Number(comparePrice);
    if (p > 0 && cp > p) {
      return Math.round(((cp - p) / cp) * 100);
    }
    return null;
  }, [price, comparePrice]);

  // Génération de la matrice de variantes
  const variantMatrix = useMemo(() => {
    if (!hasVariants || options.length === 0) return [];
    const validOptions = options.filter((o) => o.name.trim() && o.values.length > 0);
    if (validOptions.length === 0) return [];

    let combos: string[] = [''];
    for (const opt of validOptions) {
      const nextCombos: string[] = [];
      for (const prefix of combos) {
        for (const val of opt.values) {
          nextCombos.push(prefix ? `${prefix} / ${val}` : val);
        }
      }
      combos = nextCombos;
    }

    return combos.map((title, idx) => ({
      id: `var-${idx}`,
      title,
      price: price || '0',
      stock: stock || '0',
      sku: sku ? `${sku}-${idx + 1}` : '',
    }));
  }, [hasVariants, options, price, stock, sku]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Pré-compression côté client pour garantir la rapidité et contourner la limite Vercel de 4.5 Mo
  const compressImageClient = async (file: File): Promise<File | Blob> => {
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg') || file.size < 800 * 1024) {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  // Upload d'image fichier
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMsg(null);

    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];
        const fileToUpload = await compressImageClient(originalFile);
        const formData = new FormData();
        formData.append('file', fileToUpload, originalFile.name);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Échec de l'upload." }));
          throw new Error(errData.error || `Échec de l'import pour "${originalFile.name}".`);
        }

        const data = await res.json();
        if (data.url) {
          setMediaList((prev) => [...prev, data.url]);
          successCount++;
        }
      }
      if (successCount > 0) {
        showToast(`${successCount} image(s) importée(s) avec succès.`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Ajout d'image par URL
  const handleAddMediaUrl = () => {
    if (!urlInput.trim()) return;
    setMediaList((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
    setShowUrlModal(false);
    showToast('Image ajoutée par URL.');
  };

  // Réordonner les médias
  const moveMedia = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mediaList.length) return;
    setMediaList((prev) => {
      const copy = [...prev];
      const item = copy.splice(fromIndex, 1)[0];
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const removeMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsPrimaryMedia = (index: number) => {
    if (index === 0) return;
    setMediaList((prev) => {
      const copy = [...prev];
      const item = copy.splice(index, 1)[0];
      return [item, ...copy];
    });
    showToast('Définie comme image principale.');
  };

  // Gestion des tags
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const clean = tagInput.trim();
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  // Gestion des variantes
  const addOption = () => {
    if (options.length >= 3) {
      alert('Shopify autorise un maximum de 3 options par produit.');
      return;
    }
    setOptions([...options, { name: '', values: [] }]);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const addOptionValue = (optIdx: number) => {
    const val = newOptionValue[optIdx]?.trim();
    if (!val) return;
    const opt = options[optIdx];
    if (!opt.values.includes(val)) {
      const updated = [...options];
      updated[optIdx].values.push(val);
      setOptions(updated);
    }
    setNewOptionValue({ ...newOptionValue, [optIdx]: '' });
  };

  const removeOptionValue = (optIdx: number, val: string) => {
    const updated = [...options];
    updated[optIdx].values = updated[optIdx].values.filter((v) => v !== val);
    setOptions(updated);
  };

  // Insertion d'éléments dans la description (WYSIWYG Toolbar)
  const insertFormatting = (tagStart: string, tagEnd: string = '') => {
    const textarea = document.getElementById('shopify-product-description') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = description.substring(start, end);
    const replacement = tagStart + (selected || 'texte') + tagEnd;
    const nextVal = description.substring(0, start) + replacement + description.substring(end);
    setDescription(nextVal);
  };

  // Soumission principale
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Le titre du produit est obligatoire.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Veuillez spécifier un prix de vente valide en FCFA.');
      return;
    }

    setSaving(true);

    const payload = {
      ...(isEdit && initialData?.id ? { id: initialData.id } : {}),
      name: name.trim(),
      slug: customSlug || undefined,
      description: description.trim() || null,
      price: Math.round(numPrice),
      compare_at_price: comparePrice ? Math.round(Number(comparePrice)) : null,
      cost_per_item: costPerItem ? Math.round(Number(costPerItem)) : null,
      stock: trackQuantity ? Math.max(0, Math.round(Number(stock || 0))) : 999,
      sku: sku.trim(),
      barcode: barcode.trim(),
      track_quantity: trackQuantity ? 1 : 0,
      continue_selling_out_of_stock: continueSelling ? 1 : 0,
      category: category.trim() || 'Général',
      image_url: mediaList[0] || null,
      media_urls: mediaList,
      weight_kg: Number(weightKg) || 0.5,
      is_physical: isPhysical ? 1 : 0,
      vendor: vendor.trim(),
      tags: tags.join(', '),
      seo_title: seoTitle.trim() || `${name} — AFRINOVA SHOP`,
      seo_description: seoDescription.trim() || description.slice(0, 160),
      variants: hasVariants ? variantMatrix : [],
      sales_channels: [
        salesChannels.online && 'online_store',
        salesChannels.whatsapp && 'whatsapp',
        salesChannels.ads && 'ads',
      ].filter(Boolean),
      bundle_style: bundleStyle,
      bundle_accent_color: bundleAccentColor,
      status,
    };

    try {
      const url = '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’enregistrement.');
      }

      showToast(isEdit ? 'Produit mis à jour avec succès.' : 'Produit créé avec succès.');
      setTimeout(() => {
        router.push('/admin?tab=products');
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f2f4] text-slate-900 pb-24 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 animate-in slide-in-from-top-3 flex items-center gap-2.5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STICKY TOP POLARIS HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs backdrop-blur-md px-4 sm:px-8 lg:px-12 py-3.5 lg:py-4 transition-all">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin?tab=products"
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition"
              title="Retour aux produits"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {isEdit ? name || 'Modifier le produit' : 'Ajouter un produit'}
                </h1>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    status === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : status === 'draft'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {status === 'active' ? '● Actif' : status === 'draft' ? '○ Brouillon' : '× Archivé'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Standard Shopify Polaris • Gestion complète du catalogue
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin?tab=products"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
            >
              Ignorer
            </Link>
            {isEdit && customSlug && (
              <Link
                href={`/produit/${customSlug}`}
                target="_blank"
                className="hidden md:flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Voir en ligne</span>
              </Link>
            )}
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className="bg-[#008060] hover:bg-[#006e52] text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (2 COLUMNS) */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-6 lg:pt-8 pb-20">
        {errorMsg && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* ======================================================== */}
          {/* COLONNE GAUCHE (MAIN: 8 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            {/* CARD 1: TITRE & DESCRIPTION */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div>
                <label htmlFor="product-name" className="block text-xs font-black text-slate-800 mb-1.5">
                  Titre du produit <span className="text-rose-500">*</span>
                </label>
                <input
                  id="product-name"
                  type="text"
                  required
                  placeholder="ex: Sacoche en cuir pleine fleur vintage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm font-semibold rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060] placeholder:text-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="shopify-product-description" className="text-xs font-black text-slate-800">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => setHtmlMode(!htmlMode)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md cursor-pointer"
                  >
                    <Code className="w-3 h-3" />
                    <span>{htmlMode ? 'Éditeur visuel' : 'Afficher le HTML'}</span>
                  </button>
                </div>

                {/* Toolbar Shopify */}
                <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl text-slate-600 text-xs">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    className="p-1.5 hover:bg-slate-200 rounded transition font-bold"
                    title="Gras"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1.5 hover:bg-slate-200 rounded transition italic"
                    title="Italique"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<u>', '</u>')}
                    className="p-1.5 hover:bg-slate-200 rounded transition underline"
                    title="Souligné"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-[1px] bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h3>', '</h3>')}
                    className="px-2 py-1 hover:bg-slate-200 rounded transition font-bold text-[11px]"
                    title="Titre H3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n• ', '')}
                    className="p-1.5 hover:bg-slate-200 rounded transition"
                    title="Liste à puces"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n1. ', '')}
                    className="p-1.5 hover:bg-slate-200 rounded transition"
                    title="Liste numérotée"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-[1px] bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt("URL du lien :");
                      if (url) insertFormatting(`<a href="${url}" class="text-blue-600 underline">`, '</a>');
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded transition"
                    title="Lien"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt("URL de l'image à insérer :");
                      if (url) insertFormatting(`<img src="${url}" alt="Illustration" class="rounded-xl my-2" />`);
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded transition"
                    title="Insérer image"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  id="shopify-product-description"
                  rows={6}
                  placeholder="Détails du produit, caractéristiques techniques, dimensions, garanties et conseils d'utilisation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs font-medium rounded-b-xl border border-slate-300 p-3.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008060] leading-relaxed"
                />
              </div>
            </section>

            {/* CARD 2: FICHIERS MULTIMÉDIAS */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>Fichiers multimédias</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {mediaList.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Téléversez des photos nettes de votre produit. La première photo servira d&apos;image de couverture.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUrlModal(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                >
                  Ajouter par URL
                </button>
              </div>

              {/* Dropzone d'importation */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition cursor-pointer group ${
                  isDragging
                    ? 'border-[#008060] bg-emerald-50/60 ring-4 ring-emerald-500/20'
                    : 'border-slate-300 hover:border-[#008060] bg-slate-50/50 hover:bg-emerald-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.gif,.svg,.jfif,.heic,.heif"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 text-slate-600 group-hover:text-[#008060] group-hover:border-[#008060] flex items-center justify-center mx-auto mb-3 transition">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#008060]" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div className="text-xs font-black text-slate-800">
                  {isUploading ? "Importation et optimisation en cours..." : isDragging ? "Déposez vos images ici !" : "Glissez-déposez vos fichiers ici"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ou <span className="text-[#008060] font-bold underline">parcourez vos photos</span> (JPEG, PNG, WEBP, AVIF jusqu&apos;à 20 Mo)
                </p>
              </div>

              {/* Suggestions rapides Unsplash */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Exemples rapides :</span>
                {PRESET_MEDIA.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (!mediaList.includes(preset.url)) {
                        setMediaList([...mediaList, preset.url]);
                        showToast(`Photo "${preset.label}" ajoutée.`);
                      }
                    }}
                    className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition cursor-pointer"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>

              {/* Grille de prévisualisation avec mise en avant de la 1ère image */}
              {mediaList.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {mediaList.map((url, idx) => (
                    <div
                      key={url + idx}
                      className={`relative group rounded-xl overflow-hidden border bg-slate-100 aspect-square transition ${
                        idx === 0 ? 'border-2 border-[#008060] shadow-xs ring-2 ring-emerald-500/20' : 'border-slate-200'
                      }`}
                    >
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />

                      {idx === 0 && (
                        <div className="absolute top-2 left-2 bg-[#008060] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Principale</span>
                        </div>
                      )}

                      {/* Barre d'actions au survol */}
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-white text-[10px]">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveMedia(idx, idx - 1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Déplacer à gauche"
                          >
                            <MoveLeft className="w-3 h-3" />
                          </button>
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => setAsPrimaryMedia(idx)}
                              className="font-bold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[9px] flex items-center gap-1"
                            >
                              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                              <span>Couverture</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={idx === mediaList.length - 1}
                            onClick={() => moveMedia(idx, idx + 1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Déplacer à droite"
                          >
                            <MoveRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CARD 3: TARIFICATION (PRICING) */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-black text-slate-900">Tarification</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-price" className="block text-xs font-black text-slate-800 mb-1">
                    Prix de vente (FCFA) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="product-price"
                      type="number"
                      required
                      min="100"
                      placeholder="18900"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full text-xs font-black rounded-xl border border-slate-300 pl-3.5 pr-14 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      FCFA
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="product-compare-price" className="text-xs font-black text-slate-800">
                      Prix avant réduction (Prix barré)
                    </label>
                    {compareDiscount && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        -{compareDiscount}% affiché
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="product-compare-price"
                      type="number"
                      min="0"
                      placeholder="24900"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                      className="w-full text-xs font-black rounded-xl border border-slate-300 pl-3.5 pr-14 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={chargeTax}
                  onChange={(e) => setChargeTax(e.target.checked)}
                  className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                />
                <span className="text-xs font-medium text-slate-700">
                  Facturer les taxes sur ce produit (TTC inclus)
                </span>
              </label>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label htmlFor="product-cost" className="block text-xs font-black text-slate-800 mb-1">
                      Coût par article (Prix de revient)
                    </label>
                    <div className="relative">
                      <input
                        id="product-cost"
                        type="number"
                        min="0"
                        placeholder="ex: 11000"
                        value={costPerItem}
                        onChange={(e) => setCostPerItem(e.target.value)}
                        className="w-full text-xs font-bold rounded-xl border border-slate-300 pl-3.5 pr-14 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        FCFA
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marge brute</div>
                    <div className="text-sm font-black text-slate-900">
                      {marginStats.margin !== null ? (
                        <span className={marginStats.margin >= 30 ? 'text-emerald-600' : 'text-slate-800'}>
                          {marginStats.margin}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bénéfice unitaire</div>
                    <div className="text-sm font-black text-slate-900">
                      {marginStats.profit !== null ? (
                        <span className="text-emerald-600">+{formatFCFA(marginStats.profit)}</span>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Les clients ne verront pas votre coût de revient ni vos marges.</span>
                </p>
              </div>
            </section>

            {/* CARD: STYLE DES LOTS (BUNDLES) */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Style des offres de lots (Bundles)</span>
                  <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Fiche produit
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choisissez l&apos;apparence visuelle des remises dégressives (1, 2 ou 3 articles) pour ce produit.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. Style Cartes (Card) */}
                <button
                  type="button"
                  onClick={() => setBundleStyle('card')}
                  style={bundleStyle === 'card' ? { borderColor: bundleAccentColor } : undefined}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    bundleStyle === 'card'
                      ? 'bg-white ring-2 ring-slate-900/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">1. Cartes (Card)</span>
                      <span
                        style={bundleStyle === 'card' ? { borderColor: bundleAccentColor } : undefined}
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bundleStyle === 'card' ? '' : 'border-slate-300'
                        }`}
                      >
                        {bundleStyle === 'card' && <span style={{ backgroundColor: bundleAccentColor }} className="w-1.5 h-1.5 rounded-full" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Miniature photo, ruban d&apos;angle & bandeau cadeau timer (Style Capture 2).
                    </p>
                  </div>
                  <div
                    style={bundleStyle === 'card' ? { borderColor: `${bundleAccentColor}50` } : undefined}
                    className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold flex items-center justify-between"
                  >
                    <span>🖼️ Photo + Ruban</span>
                    <span style={{ color: bundleAccentColor }}>Duo -10%</span>
                  </div>
                </button>

                {/* 2. Style Pilules (Pill) */}
                <button
                  type="button"
                  onClick={() => setBundleStyle('pill')}
                  style={bundleStyle === 'pill' ? { borderColor: bundleAccentColor } : undefined}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    bundleStyle === 'pill'
                      ? 'bg-white ring-2 ring-slate-900/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">2. Pilules (Pill)</span>
                      <span
                        style={bundleStyle === 'pill' ? { borderColor: bundleAccentColor } : undefined}
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bundleStyle === 'pill' ? '' : 'border-slate-300'
                        }`}
                      >
                        {bundleStyle === 'pill' && <span style={{ backgroundColor: bundleAccentColor }} className="w-1.5 h-1.5 rounded-full" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Formes ultra-arrondies, boutons radio & pastilles pleines (Style Capture 1).
                    </p>
                  </div>
                  <div
                    style={{ borderColor: bundleAccentColor }}
                    className="mt-3 p-2 rounded-full bg-white border-2 text-[10px] font-bold flex items-center justify-between"
                  >
                    <span>🔘 Radio rond</span>
                    <span style={{ color: bundleAccentColor }}>✨ -10% ✨</span>
                  </div>
                </button>

                {/* 3. Style Grille 3 Colonnes (Grid) */}
                <button
                  type="button"
                  onClick={() => setBundleStyle('grid')}
                  style={bundleStyle === 'grid' ? { borderColor: bundleAccentColor } : undefined}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    bundleStyle === 'grid'
                      ? 'bg-white ring-2 ring-slate-900/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">3. Grille (Grid)</span>
                      <span
                        style={bundleStyle === 'grid' ? { borderColor: bundleAccentColor } : undefined}
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bundleStyle === 'grid' ? '' : 'border-slate-300'
                        }`}
                      >
                        {bundleStyle === 'grid' && <span style={{ backgroundColor: bundleAccentColor }} className="w-1.5 h-1.5 rounded-full" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      3 boîtes verticales côte à côte avec calcul du prix unitaire par pièce.
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 text-[9px] font-black text-center">
                    <div className="p-1 rounded bg-slate-100">x1</div>
                    <div style={{ backgroundColor: bundleAccentColor, color: '#fff' }} className="p-1 rounded shadow-2xs">x2 ★</div>
                    <div className="p-1 rounded bg-slate-100">x3</div>
                  </div>
                </button>

                {/* 4. Style Minimaliste (Compact) */}
                <button
                  type="button"
                  onClick={() => setBundleStyle('compact')}
                  style={bundleStyle === 'compact' ? { borderColor: bundleAccentColor } : undefined}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    bundleStyle === 'compact'
                      ? 'bg-white ring-2 ring-slate-900/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">4. Minimaliste (Compact)</span>
                      <span
                        style={bundleStyle === 'compact' ? { borderColor: bundleAccentColor } : undefined}
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bundleStyle === 'compact' ? '' : 'border-slate-300'
                        }`}
                      >
                        {bundleStyle === 'compact' && <span style={{ backgroundColor: bundleAccentColor }} className="w-1.5 h-1.5 rounded-full" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Lignes ultra-fines épurées avec coches discrètes ✓ sans images.
                    </p>
                  </div>
                  <div className="mt-3 p-1.5 rounded-lg border border-slate-200 text-[10px] font-bold flex items-center justify-between">
                    <span>✓ Ligne fine</span>
                    <span className="font-mono text-slate-600">Compact</span>
                  </div>
                </button>

                {/* 5. Style Bannières Flash (Badge Stack) */}
                <button
                  type="button"
                  onClick={() => setBundleStyle('badge_stack')}
                  style={bundleStyle === 'badge_stack' ? { borderColor: bundleAccentColor } : undefined}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    bundleStyle === 'badge_stack'
                      ? 'bg-white ring-2 ring-slate-900/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-900">5. Flash Promo (Badge Stack)</span>
                      <span
                        style={bundleStyle === 'badge_stack' ? { borderColor: bundleAccentColor } : undefined}
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bundleStyle === 'badge_stack' ? '' : 'border-slate-300'
                        }`}
                      >
                        {bundleStyle === 'badge_stack' && <span style={{ backgroundColor: bundleAccentColor }} className="w-1.5 h-1.5 rounded-full" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Gros blocs carrés de réduction à gauche avec montant économisé en vert.
                    </p>
                  </div>
                  <div className="mt-3 p-1.5 rounded-xl border border-slate-200 text-[10px] font-bold flex items-center gap-2">
                    <span style={{ backgroundColor: bundleAccentColor, color: '#fff' }} className="px-1.5 py-0.5 rounded font-black text-[9px]">-15%</span>
                    <span className="text-emerald-700 font-extrabold">Économie max</span>
                  </div>
                </button>
              </div>

              {/* SÉLECTEUR DE COULEUR D'ACCENTUATION DU PRODUIT */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-800">
                      Couleur d&apos;accentuation du Bundle
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Personnalisez la couleur des bordures, radios, rubans et badges pour ce produit.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs inline-block"
                      style={{ backgroundColor: bundleAccentColor }}
                    />
                    <span className="font-mono text-xs font-bold text-slate-700 uppercase">
                      {bundleAccentColor}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { name: 'Rose Flash (Screenshot 1)', hex: '#E91E63' },
                    { name: 'Bleu Indigo (Screenshot 2)', hex: '#4F46E5' },
                    { name: 'Or Atelier', hex: '#C27835' },
                    { name: 'Vert Polaris', hex: '#008060' },
                    { name: 'Bleu Royal', hex: '#2563EB' },
                    { name: 'Noir Ébène', hex: '#121316' },
                    { name: 'Rouge Flash', hex: '#DC2626' },
                    { name: 'Violet Luxe', hex: '#7C3AED' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setBundleAccentColor(c.hex)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                        bundleAccentColor?.toLowerCase() === c.hex.toLowerCase()
                          ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}

                  {/* Pipette personnalisée */}
                  <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white">
                    <input
                      type="color"
                      value={bundleAccentColor}
                      onChange={(e) => setBundleAccentColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                      title="Choisir une couleur sur mesure"
                    />
                    <input
                      type="text"
                      value={bundleAccentColor}
                      onChange={(e) => setBundleAccentColor(e.target.value)}
                      placeholder="#HEX"
                      className="w-16 font-mono text-[11px] uppercase font-bold text-slate-800 bg-transparent border-0 focus:outline-none"
                    />
                  </div>
                </div>

                {/* APERÇU EN DIRECT DU BUNDLE SÉLECTIONNÉ */}
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>👁️ Aperçu interactif en direct (comme sur votre boutique)</span>
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Rendu réel
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Style actif : <strong className="text-slate-900 uppercase font-bold">{bundleStyle}</strong> • Couleur : <strong className="font-mono text-slate-900 uppercase font-bold">{bundleAccentColor}</strong>
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 lg:p-8 rounded-3xl bg-slate-50/80 border border-slate-200/90 shadow-inner">
                    <BundleSelector
                      bundles={previewBundles}
                      variant={bundleStyle}
                      accent={bundleAccentColor}
                      value={previewSelectedBundleId}
                      onChange={(b) => setPreviewSelectedBundleId(b.id)}
                      image={mediaList[0] || null}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* CARD 4: INVENTAIRE */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-black text-slate-900">Inventaire & Stock</h2>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackQuantity}
                  onChange={(e) => setTrackQuantity(e.target.checked)}
                  className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                />
                <span className="text-xs font-bold text-slate-800">Suivre la quantité en stock</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label htmlFor="product-stock" className="block text-xs font-black text-slate-800 mb-1">
                    Quantité disponible
                  </label>
                  <input
                    id="product-stock"
                    type="number"
                    min="0"
                    disabled={!trackQuantity}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full text-xs font-black rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060] disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label htmlFor="product-sku" className="block text-xs font-black text-slate-800 mb-1">
                    SKU (Code de référence)
                  </label>
                  <input
                    id="product-sku"
                    type="text"
                    placeholder="ex: SAC-CUIR-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                  />
                </div>

                <div>
                  <label htmlFor="product-barcode" className="block text-xs font-black text-slate-800 mb-1">
                    Code-barres (ISBN, UPC, GTIN)
                  </label>
                  <input
                    id="product-barcode"
                    type="text"
                    placeholder="ex: 0123456789012"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={continueSelling}
                  onChange={(e) => setContinueSelling(e.target.checked)}
                  className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                />
                <span className="text-xs font-medium text-slate-700">
                  Continuer à vendre lorsque le stock est épuisé (Précommande)
                </span>
              </label>
            </section>

            {/* CARD 5: EXPÉDITION */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <h2 className="text-sm font-black text-slate-900">Expédition</h2>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPhysical}
                  onChange={(e) => setIsPhysical(e.target.checked)}
                  className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                />
                <span className="text-xs font-bold text-slate-800">
                  Il s&apos;agit d&apos;un produit physique nécessitant une livraison
                </span>
              </label>

              {isPhysical && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label htmlFor="product-weight" className="block text-xs font-black text-slate-800 mb-1">
                      Poids unitaire (kg)
                    </label>
                    <div className="relative">
                      <input
                        id="product-weight"
                        type="number"
                        step="0.05"
                        min="0"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full text-xs font-bold rounded-xl border border-slate-300 pl-3.5 pr-10 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        kg
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">Pays de provenance</label>
                    <input
                      type="text"
                      disabled
                      value="Bénin (National & Sous-région)"
                      className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-slate-600"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* CARD 6: VARIANTES (OPTIONS DE PRODUIT) */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Variantes</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ajoutez des options comme la taille, la couleur ou la matière.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                  />
                  <span className="text-xs font-bold text-slate-800">Activer les options</span>
                </label>
              </div>

              {hasVariants && (
                <div className="space-y-4 pt-2">
                  {options.map((opt, optIdx) => (
                    <div key={optIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                            Nom de l&apos;option
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Taille, Couleur, Matériau..."
                            value={opt.name}
                            onChange={(e) => {
                              const updated = [...options];
                              updated[optIdx].name = e.target.value;
                              setOptions(updated);
                            }}
                            className="w-full text-xs font-bold rounded-lg border border-slate-300 px-3 py-1.5 bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOption(optIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition cursor-pointer mt-4"
                          title="Supprimer cette option"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Valeurs de l'option */}
                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                          Valeurs de l&apos;option
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {opt.values.map((val) => (
                            <span
                              key={val}
                              className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                            >
                              <span>{val}</span>
                              <button
                                type="button"
                                onClick={() => removeOptionValue(optIdx, val)}
                                className="text-slate-400 hover:text-rose-600 font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Tapez une valeur (ex: Noir, S, 42) et appuyez sur Ajouter"
                            value={newOptionValue[optIdx] || ''}
                            onChange={(e) =>
                              setNewOptionValue({ ...newOptionValue, [optIdx]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addOptionValue(optIdx);
                              }
                            }}
                            className="flex-1 text-xs font-medium rounded-lg border border-slate-300 px-3 py-1.5 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => addOptionValue(optIdx)}
                            className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {options.length < 3 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs font-bold text-[#008060] hover:text-[#006e52] flex items-center gap-1.5 py-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une autre option</span>
                    </button>
                  )}

                  {/* Tableau matriciel généré automatiquement */}
                  {variantMatrix.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="text-xs font-black text-slate-800 mb-2">
                        Combinaisons de variantes ({variantMatrix.length})
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black">
                            <tr>
                              <th className="p-2.5">Variante</th>
                              <th className="p-2.5">Prix (FCFA)</th>
                              <th className="p-2.5">Stock</th>
                              <th className="p-2.5">SKU</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {variantMatrix.map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50/60">
                                <td className="p-2.5 font-bold text-slate-900">{v.title}</td>
                                <td className="p-2.5 font-mono text-slate-700">{formatFCFA(Number(v.price))}</td>
                                <td className="p-2.5 font-bold text-slate-700">{v.stock} disp.</td>
                                <td className="p-2.5 font-mono text-slate-500">{v.sku || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* CARD 7: APERÇU DU RÉFÉRENCEMENT (SEO GOOGLE SERP) */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Aperçu du référencement sur les moteurs de recherche
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Voici comment ce produit apparaîtra dans les résultats de recherche Google.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeoEdit(!showSeoEdit)}
                  className="text-xs font-bold text-[#008060] hover:text-[#006e52] cursor-pointer"
                >
                  {showSeoEdit ? 'Masquer' : 'Modifier le référencement'}
                </button>
              </div>

              {/* Aperçu Réaliste SERP Google */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-600 truncate flex items-center gap-1 font-mono">
                  <span>https://boutique.bj/produit/{customSlug || 'mon-produit'}</span>
                </div>
                <div className="text-sm font-bold text-[#1a0dab] hover:underline cursor-pointer leading-tight truncate">
                  {seoTitle || name || 'Titre de votre produit'} — AFRINOVA SHOP Bénin
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {seoDescription ||
                    description ||
                    'Commandez ce produit avec livraison express à domicile partout au Bénin (Cotonou, Calavi, Porto-Novo) et paiement à la livraison.'}
                </p>
              </div>

              {/* Formulaire SEO modifiable */}
              {showSeoEdit && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-700">Titre de la page</label>
                      <span className="text-[10px] text-slate-400">{(seoTitle || name).length} / 70 caractères</span>
                    </div>
                    <input
                      type="text"
                      maxLength={70}
                      placeholder={name || 'Titre optimisé pour Google'}
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className="w-full text-xs font-medium rounded-xl border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-700">Méta-description</label>
                      <span className="text-[10px] text-slate-400">{(seoDescription || description).length} / 320 caractères</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={320}
                      placeholder="Description percutante qui s'affiche sous le titre dans les résultats Google..."
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      className="w-full text-xs font-medium rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Handle d&apos;URL (Slug)</label>
                    <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#008060]">
                      <span className="bg-slate-100 text-slate-500 text-xs px-3 py-2 flex items-center border-r border-slate-200">
                        /produit/
                      </span>
                      <input
                        type="text"
                        value={customSlug}
                        onChange={(e) => setCustomSlug(e.target.value)}
                        className="flex-1 text-xs font-mono font-medium px-3 py-2 text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ======================================================== */}
          {/* COLONNE DROITE (SIDEBAR: 4 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 space-y-6 lg:space-y-8">
            {/* CARD 1: STATUT DU PRODUIT */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h2 className="text-sm font-black text-slate-900">Statut du produit</h2>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'draft' | 'archived')}
                className="w-full text-xs font-extrabold rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008060]"
              >
                <option value="active">Actif (En vente sur la boutique)</option>
                <option value="draft">Brouillon (Masqué aux clients)</option>
                <option value="archived">Archivé</option>
              </select>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {status === 'active'
                  ? 'Ce produit est actuellement visible et commandable par vos clients sur la boutique.'
                  : status === 'draft'
                  ? 'Ce produit ne sera pas visible sur la boutique publique tant qu’il reste en brouillon.'
                  : 'Ce produit est retiré du catalogue actif mais ses statistiques restent préservées.'}
              </p>
            </section>

            {/* CARD 2: CANAUX DE VENTE ET MARCHÉS */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h2 className="text-sm font-black text-slate-900">Canaux de vente</h2>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salesChannels.online}
                    onChange={(e) => setSalesChannels({ ...salesChannels, online: e.target.checked })}
                    className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                  />
                  <span className="font-bold text-slate-800">Boutique en ligne</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salesChannels.whatsapp}
                    onChange={(e) => setSalesChannels({ ...salesChannels, whatsapp: e.target.checked })}
                    className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                  />
                  <span className="font-bold text-slate-800">WhatsApp Direct (Bénin)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salesChannels.ads}
                    onChange={(e) => setSalesChannels({ ...salesChannels, ads: e.target.checked })}
                    className="w-4 h-4 rounded text-[#008060] focus:ring-[#008060]"
                  />
                  <span className="font-bold text-slate-800">Campagnes Pubs (TikTok / FB)</span>
                </label>
              </div>
            </section>

            {/* CARD 3: ORGANISATION DES PRODUITS */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h2 className="text-sm font-black text-slate-900">Organisation des produits</h2>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catégorie / Type de produit
                </label>
                <input
                  type="text"
                  placeholder="ex: Maroquinerie"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                        category === cat
                          ? 'bg-[#008060] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendeur / Fournisseur */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur (Vendeur)</label>
                <input
                  type="text"
                  placeholder="ex: Atelier Artisanal Cotonou"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full text-xs font-medium rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008060]"
                />
              </div>

              {/* Balises / Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Balises (Tags)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-md"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="text-slate-400 hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nouveau tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </section>

            {/* CARD 4: MODÈLE DE THÈME */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h2 className="text-sm font-black text-slate-900">Modèle de thème</h2>
              <select className="w-full text-xs font-bold rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008060]">
                <option value="default">Modèle de produit par défaut</option>
                <option value="direct-landing">Page de vente directe (Landing COD Option 2)</option>
              </select>
            </section>
          </div>

          {/* BARRE D'ACTION INFÉRIEURE */}
          <div className="lg:col-span-12 pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            <Link
              href="/admin?tab=products"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition w-full sm:w-auto text-center"
            >
              ← Retour au catalogue
            </Link>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving}
                className="w-full sm:w-auto bg-[#008060] hover:bg-[#006e52] text-white text-xs font-black px-6 py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Enregistrement en cours...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isEdit ? 'Mettre à jour le produit' : 'Enregistrer le produit'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* MODAL AJOUT MEDIA PAR URL */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Ajouter un fichier multimédia par URL</h3>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">Lien direct de l&apos;image</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... ou /images/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008060]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddMediaUrl}
                className="bg-[#008060] hover:bg-[#006e52] text-white text-xs font-black px-4 py-2 rounded-xl transition"
              >
                Ajouter l&apos;image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
