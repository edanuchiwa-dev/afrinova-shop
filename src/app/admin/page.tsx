'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ShoppingBag,
  Package,
  Tag,
  MessageSquare,
  Settings,
  Search,
  X,
  Download,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  MapPin,
  Pause,
  Play,
  Sliders,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Check,
  Crown,
  Smartphone,
  Sparkles,
  Banknote,
  Palette,
  Zap,
  Star,
  Pencil,
  RefreshCw,
  LogOut,
  Layers,
  Menu,
  ChevronRight,
  Command,
  ArrowRight,
  Globe,
  SlidersHorizontal,
  Store,
  Clock,
  ShieldCheck,
  Filter,
  ArrowUpRight,
  MessageCircle,
} from 'lucide-react';
import { formatFCFA } from '@/lib/format';
import ShopifyAnalyticsDashboard from '@/components/admin/ShopifyAnalyticsDashboard';
import QuantityBreaksWidget from '@/components/QuantityBreaksWidget';
import WhatsAppSettingsTab from '@/components/admin/WhatsAppSettingsTab';

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  category: string;
  status: string;
  image_url: string | null;
};

type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
};

type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  carrier: string;
  neighborhood?: string;
  landmark?: string;
  location_url?: string;
  payment_method?: string;
  total_price: number;
  status: 'nouvelle' | 'en_preparation' | 'expediee' | 'livree' | 'annulee';
  tracking_number: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  created_at: string;
  items?: OrderItem[];
};

type AdminPromotion = {
  id: number;
  product_id: number;
  product_name: string;
  product_stock: number;
  product_slug: string;
  name: string;
  original_price: number;
  promo_price: number;
  total_quota: number;
  consumed_quota: number;
  reserved_quota: number;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'ended';
  show_remaining: number;
  created_at: string;
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [adminReviews, setAdminReviews] = useState<Array<{
    id: number;
    product_id: number;
    product_name?: string;
    rating: number;
    customer_name: string;
    city: string;
    comment: string;
    status: 'en_attente' | 'approuve' | 'rejete';
    created_at: string;
  }>>([]);
  const [showCreateReviewModal, setShowCreateReviewModal] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState<{
    productId: number | null;
    rating: number;
    customerName: string;
    city: string;
    comment: string;
    status: 'approuve' | 'en_attente';
  }>({
    productId: null,
    rating: 5,
    customerName: '',
    city: 'Cotonou',
    comment: '',
    status: 'approuve',
  });
  const [creatingReview, setCreatingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'products' | 'promotions' | 'reviews' | 'whatsapp'>('analytics');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [liveVisitorCount, setLiveVisitorCount] = useState<number>(0);

  // Navigation fluide & Palette de commandes rapides
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  // Changement d'onglet avec synchronisation URL et fermeture mobile automatique
  const handleTabChange = (tab: 'analytics' | 'orders' | 'products' | 'promotions' | 'reviews' | 'whatsapp') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url.toString());
    }
    setSidebarOpen(false);
  };

  const [trackingDrafts, setTrackingDrafts] = useState<Record<number, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<number, string>>({});

  // Gestion des Produits & Stocks
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Maroquinerie',
    price: '',
    stock: '',
    description: '',
    image_url: '',
  });
  const [stockInputs, setStockInputs] = useState<Record<number, number>>({});
  const [priceInputs, setPriceInputs] = useState<Record<number, number>>({});

  // Gestion des Promotions à stock limité
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({
    product_id: '',
    name: '',
    original_price: '',
    promo_price: '',
    total_quota: '',
    start_date: '',
    end_date: '',
    status: 'active' as 'draft' | 'active' | 'paused' | 'ended',
    show_remaining: true,
  });

  // Configuration Quantity Breaks (Shopify Polaris Volume Discounts)
  const [qbSettings, setQbSettings] = useState({
    qb_enabled: '1',
    qb_popular_tier: '2',
    qb_tier1_label: '1 Article',
    qb_tier2_label: 'Lot de 2 Articles',
    qb_tier3_label: 'Lot de 3 Articles',
    qb_tier2_subtitle: 'Le Pack Duo Privilège',
    qb_tier3_subtitle: 'Pack Famille & Cadeaux',
    qb_tier2_badge: 'PLUS POPULAIRE',
    qb_tier3_badge: 'MEILLEURE VALEUR',
    qb_template: 'modern',
    qb_accent_color: '#C27835',
  });
  const [savingQb, setSavingQb] = useState(false);
  const [previewQty, setPreviewQty] = useState(2);

  // Filtres et Recherche avancée
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [utmFilter, setUtmFilter] = useState('all');

  const availableUtmSources = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.utm_source) set.add(o.utm_source.toLowerCase());
    }
    return Array.from(set);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (utmFilter !== 'all') {
        const source = (o.utm_source || 'direct').toLowerCase();
        if (source !== utmFilter.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.toLowerCase().includes(q) ||
          o.shipping_city.toLowerCase().includes(q) ||
          (o.neighborhood && o.neighborhood.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, statusFilter, utmFilter, searchQuery]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'nouvelle').length;
  }, [orders]);

  const paletteResults = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const navModules = [
      { id: 'analytics' as const, title: 'Analyses & Vue d\'ensemble', desc: 'Chiffre d\'affaires, tunnel de vente et conversions', icon: BarChart3 },
      { id: 'orders' as const, title: 'Gestion des Commandes', desc: `${orders.length} commande(s) dont ${pendingOrdersCount} nouvelle(s)`, icon: ShoppingBag },
      { id: 'products' as const, title: 'Produits & Liens Publicités', desc: `${products.length} article(s) au catalogue physique`, icon: Package },
      { id: 'promotions' as const, title: 'Promotions Flash & Lots', desc: `${promotions.length} offre(s) promotionnelle(s)`, icon: Sparkles },
      { id: 'reviews' as const, title: 'Modération des Avis Clients', desc: `${adminReviews.length} avis reçu(s)`, icon: MessageSquare },
      { id: 'whatsapp' as const, title: 'Alertes WhatsApp Directes', desc: 'Notifications automatiques et modèle de message sur-mesure', icon: MessageCircle },
    ].filter((m) => !q || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));

    const matchedOrders = q
      ? orders
          .filter(
            (o) =>
              o.order_number.toLowerCase().includes(q) ||
              o.customer_name.toLowerCase().includes(q) ||
              o.customer_phone.toLowerCase().includes(q) ||
              o.shipping_city.toLowerCase().includes(q)
          )
          .slice(0, 5)
      : [];

    const matchedProducts = q
      ? products
          .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
          .slice(0, 5)
      : [];

    return { navModules, matchedOrders, matchedProducts };
  }, [paletteQuery, orders, products, promotions, adminReviews, pendingOrdersCount]);

  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      showToast('Aucune commande à exporter.');
      return;
    }
    const headers = [
      'Numéro de commande',
      'Date',
      'Client',
      'Téléphone',
      'Commune',
      'Quartier',
      'Point de repère',
      'Transporteur',
      'Total FCFA',
      'Statut',
      'Numéro de suivi',
      'Source UTM',
      'Campagne UTM',
      'Articles',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredOrders.map((o) => {
      const itemsStr = o.items ? o.items.map((it) => `${it.quantity}x ${it.product_name}`).join(' | ') : '';
      return [
        escapeCsv(o.order_number),
        escapeCsv(o.created_at),
        escapeCsv(o.customer_name),
        escapeCsv(o.customer_phone),
        escapeCsv(o.shipping_city),
        escapeCsv(o.neighborhood || ''),
        escapeCsv(o.landmark || ''),
        escapeCsv(o.carrier),
        escapeCsv(o.total_price),
        escapeCsv(o.status),
        escapeCsv(o.tracking_number || ''),
        escapeCsv(o.utm_source || 'direct'),
        escapeCsv(o.utm_campaign || ''),
        escapeCsv(itemsStr),
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `commandes_atelier_pro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Export CSV réussi (${filteredOrders.length} commandes).`, 'success');
  };

  const showToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    const cleanMsg = msg.replace(/[\u{10000}-\u{10ffff}\u{2600}-\u{27bf}\u{2300}-\u{23ff}\u{2700}-\u{27bf}\u{2b00}-\u{2bff}✓✕]/gu, '').trim();
    const detectedType = type || (
      /succès|réussi|approuvé|activé|enregistré/i.test(cleanMsg) ? 'success' :
      /erreur|échec|invalide|obligatoire|rejeté|supprimé/i.test(cleanMsg) ? 'error' : 'info'
    );
    setToast({ message: cleanMsg, type: detectedType });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadData = async () => {
    try {
      const [prodRes, ordRes, revRes, promoRes, setRes, liveRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/reviews'),
        fetch('/api/admin/promotions'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/live-visitors').catch(() => null),
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData);
      }
      if (revRes.ok) {
        const revData = await revRes.json();
        setAdminReviews(revData.reviews || []);
      }
      if (promoRes && promoRes.ok) {
        const promoData = await promoRes.json();
        setPromotions(promoData);
      }
      if (setRes && setRes.ok) {
        const setData = await setRes.json();
        setQbSettings(setData);
      }
      if (liveRes && liveRes.ok) {
        const liveData = await liveRes.json();
        setLiveVisitorCount(liveData.activeCount || 0);
      }
    } catch (err) {
      console.error('Erreur chargement admin :', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQbSettings = async () => {
    setSavingQb(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qbSettings),
      });
      if (res.ok) {
        showToast('Configuration Quantity Breaks enregistrée avec succès.', 'success');
      } else {
        showToast('Erreur lors de l’enregistrement des paramètres.', 'error');
      }
    } catch {
      showToast('Erreur réseau.', 'error');
    } finally {
      setSavingQb(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.product_id) {
      showToast('Veuillez sélectionner un produit.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(promoForm.product_id),
          name: promoForm.name.trim(),
          original_price: Number(promoForm.original_price),
          promo_price: Number(promoForm.promo_price),
          total_quota: Number(promoForm.total_quota),
          start_date: promoForm.start_date || null,
          end_date: promoForm.end_date || null,
          status: promoForm.status,
          show_remaining: promoForm.show_remaining,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la promotion.');
      }
      showToast('Promotion créée et activée avec succès.', 'success');
      setShowPromoModal(false);
      setPromoForm({
        product_id: '',
        name: '',
        original_price: '',
        promo_price: '',
        total_quota: '',
        start_date: '',
        end_date: '',
        status: 'active',
        show_remaining: true,
      });
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  };

  const handleUpdatePromoStatus = async (id: number, status: 'active' | 'paused' | 'ended') => {
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec de la mise à jour du statut.');
      }
      showToast(`Statut de la promotion mis à jour : ${status}.`, 'info');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  };

  const handleDeletePromo = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette promotion ?')) return;
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression.');
      }
      showToast('Promotion supprimée.', 'info');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  };

  const handleModerateReview = async (id: number, status: 'approuve' | 'rejete') => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setAdminReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
        showToast(status === 'approuve' ? 'Avis approuvé et publié.' : 'Avis rejeté.', status === 'approuve' ? 'success' : 'info');
      }
    } catch {
      showToast('Erreur lors de la modération.', 'error');
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewForm.customerName.trim() || !newReviewForm.comment.trim()) {
      showToast('Veuillez renseigner le nom et le commentaire.', 'error');
      return;
    }
    setCreatingReview(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReviewForm),
      });
      if (res.ok) {
        showToast('Nouvel avis client créé et publié.', 'success');
        setShowCreateReviewModal(false);
        setNewReviewForm({
          productId: null,
          rating: 5,
          customerName: '',
          city: 'Cotonou',
          comment: '',
          status: 'approuve',
        });
        loadData();
      } else {
        showToast('Erreur lors de la création de l\'avis.', 'error');
      }
    } catch {
      showToast('Erreur de communication.', 'error');
    } finally {
      setCreatingReview(false);
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cet avis client ?')) return;
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAdminReviews((prev) => prev.filter((r) => r.id !== id));
        showToast('Avis supprimé définitivement.', 'info');
      } else {
        showToast('Erreur lors de la suppression.', 'error');
      }
    } catch {
      showToast('Erreur de suppression.', 'error');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab === 'analytics' || tab === 'products' || tab === 'orders' || tab === 'promotions' || tab === 'reviews' || tab === 'whatsapp') {
        setActiveTab(tab as 'analytics' | 'orders' | 'products' | 'promotions' | 'reviews' | 'whatsapp');
      }
    }
    loadData();
  }, []);

  // Écoute de l'historique du navigateur (Précédent / Suivant) pour garder l'onglet synchronisé
  useEffect(() => {
    const handlePopState = () => {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab === 'analytics' || tab === 'products' || tab === 'orders' || tab === 'promotions' || tab === 'reviews' || tab === 'whatsapp') {
        setActiveTab(tab as 'analytics' | 'orders' | 'products' | 'promotions' | 'reviews' | 'whatsapp');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Raccourci clavier universel Cmd+K ou Ctrl+K pour ouvrir la palette de recherche rapide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Polling périodique des visiteurs en direct (toutes les 15s)
  useEffect(() => {
    const updateLive = async () => {
      try {
        const res = await fetch('/api/admin/live-visitors');
        if (res.ok) {
          const data = await res.json();
          setLiveVisitorCount(data.activeCount || 0);
        }
      } catch {
        // silencieux
      }
    };
    const interval = setInterval(updateLive, 15000);
    return () => clearInterval(interval);
  }, []);

  const copyAdLink = (slug: string, productName: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const adUrl = `${origin}/produit/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(adUrl).then(() => {
        showToast(`Lien pub copié pour "${productName}". Prêt pour TikTok, WhatsApp ou Facebook.`, 'info');
      });
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      showToast('Le nom du produit est obligatoire.', 'error');
      return;
    }
    const priceNum = Number(newProductForm.price);
    if (!priceNum || priceNum < 0) {
      showToast('Veuillez renseigner un prix valide en FCFA.', 'error');
      return;
    }
    const stockNum = Number(newProductForm.stock || 0);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductForm.name,
          category: newProductForm.category,
          price: priceNum,
          stock: stockNum,
          description: newProductForm.description,
          image_url: newProductForm.image_url || null,
        }),
      });
      if (res.ok) {
        const created: Product = await res.json();
        setProducts((prev) => [created, ...prev]);
        setShowAddModal(false);
        setNewProductForm({
          name: '',
          category: 'Maroquinerie',
          price: '',
          stock: '',
          description: '',
          image_url: '',
        });
        showToast(`Produit "${created.name}" ajouté avec succès.`, 'success');
      } else {
        const err = await res.json();
        showToast(`Erreur : ${err.error || 'Impossible d’ajouter le produit.'}`, 'error');
      }
    } catch {
      showToast('Erreur réseau lors de la création.', 'error');
    }
  };

  const handleUpdateProduct = async (id: number, updates: { stock?: number; price?: number; status?: string }) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        const updated: Product = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
        showToast('Produit mis à jour avec succès.', 'success');
      } else {
        const err = await res.json();
        showToast(`Erreur : ${err.error || 'Échec de la mise à jour.'}`, 'error');
      }
    } catch {
      showToast('Erreur réseau.', 'error');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!window.confirm(`Voulez-vous vraiment retirer "${name}" du catalogue ?`)) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.archived) {
          setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'archived' } : p)));
          showToast(`"${name}" a été archivé (car lié à des commandes).`, 'info');
        } else {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          showToast(`"${name}" supprimé définitivement.`, 'info');
        }
      } else {
        showToast('Erreur lors de la suppression.', 'error');
      }
    } catch {
      showToast('Erreur réseau.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.href = '/admin/login';
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (res.ok) {
        showToast('Statut de la commande mis à jour.', 'success');
        loadData();
      }
    } catch {
      showToast('Échec de la mise à jour.', 'error');
    }
  };

  const updateOrderTracking = async (orderId: number) => {
    const tracking = trackingDrafts[orderId];
    if (tracking === undefined) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, tracking_number: tracking }),
      });
      if (res.ok) {
        showToast('Numéro de suivi enregistré.', 'success');
        loadData();
      }
    } catch {
      showToast('Échec de la mise à jour.', 'error');
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-top-3 flex items-center gap-2.5">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Backdrop Mobile pour tiroir de navigation */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR PERSISTANTE (Style Shopify Polaris) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B1120] text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* En-tête Sidebar & Statut Boutique */}
        <div>
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-900/30">
                AP
              </div>
              <div>
                <div className="font-heading font-black text-sm text-white tracking-tight leading-tight">
                  Atelier Pro
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-400 tracking-wide">
                    {liveVisitorCount > 0 ? `${liveVisitorCount} en direct • Cotonou` : 'En ligne • Cotonou'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Déclencheur Recherche Rapide (Sidebar Mobile & Desktop) */}
          <div className="p-3">
            <button
              onClick={() => {
                setCommandPaletteOpen(true);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition" />
                <span>Recherche rapide...</span>
              </div>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-300 rounded border border-slate-700">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Principale */}
          <div className="px-3 py-2 space-y-6">
            <div>
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Modules de gestion
              </div>
              <nav className="space-y-1">
                {/* 1. Analytics */}
                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'analytics'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Vue d&apos;ensemble</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {liveVisitorCount > 0 && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'analytics' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      Live View
                    </span>
                  </div>
                </button>

                {/* 2. Commandes */}
                <button
                  onClick={() => handleTabChange('orders')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className={`w-4 h-4 ${activeTab === 'orders' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Commandes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pendingOrdersCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold animate-pulse">
                        {pendingOrdersCount} new
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {orders.length}
                    </span>
                  </div>
                </button>

                {/* 3. Produits */}
                <button
                  onClick={() => handleTabChange('products')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className={`w-4 h-4 ${activeTab === 'products' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Catalogue Produits</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {products.length}
                  </span>
                </button>

                {/* 4. Promotions */}
                <button
                  onClick={() => handleTabChange('promotions')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'promotions'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className={`w-4 h-4 ${activeTab === 'promotions' ? 'text-white' : 'text-amber-400'}`} />
                    <span>Promotions & Lots</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'promotions' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {promotions.length}
                  </span>
                </button>

                {/* 5. Avis Clients */}
                <button
                  onClick={() => handleTabChange('reviews')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'reviews'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className={`w-4 h-4 ${activeTab === 'reviews' ? 'text-white' : 'text-slate-400'}`} />
                    <span>Avis Clients</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'reviews' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {adminReviews.length}
                  </span>
                </button>

                {/* 6. Alertes WhatsApp */}
                <button
                  onClick={() => handleTabChange('whatsapp')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className={`w-4 h-4 ${activeTab === 'whatsapp' ? 'text-white' : 'text-emerald-400'}`} />
                    <span>Alertes WhatsApp</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'whatsapp' ? 'bg-white/20 text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    Direct
                  </span>
                </button>
              </nav>
            </div>

            {/* Raccourcis Rapides */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Raccourcis Boutique
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/products/new"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nouveau Produit</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                    Shopify
                  </span>
                </Link>

                <Link
                  href="/"
                  target="_blank"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    <span>Vitrine Boutique</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/suivi"
                  target="_blank"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Suivi Colis Client</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bas de Sidebar : Statut Base & Déconnexion */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>SQLite WAL</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">Actif</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Quitter</span>
          </button>
        </div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPALE (Offset sidebar sur grand écran lg:pl-64) */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* TOPBAR FLOTTANTE & RECHERCHE GLOBALE */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Bouton Menu Mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Ouvrir le menu de navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Barre de Recherche Globale déclenchant la palette */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-500 rounded-xl px-3.5 py-2 text-xs font-semibold border border-slate-200/80 transition cursor-pointer w-48 sm:w-80 justify-between group"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                <span className="truncate">Rechercher commande, produit, client...</span>
              </div>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-white text-slate-600 rounded-md border border-slate-200 shadow-2xs shrink-0">
                Ctrl + K
              </kbd>
            </button>
          </div>

          {/* Actions Rapides en haut à droite */}
          <div className="flex items-center gap-2">
            {/* Badge Live Visitors */}
            <button
              onClick={() => handleTabChange('analytics')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
              title="Acheteurs en direct sur le site (cliquez pour ouvrir les analyses)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-extrabold tabular-nums">{liveVisitorCount}</span>
              <span className="hidden sm:inline font-semibold text-[11px] text-emerald-700">en direct</span>
            </button>

            <Link
              href="/admin/products/new"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Produit</span>
            </Link>

            <button
              onClick={() => setShowPromoModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Promo</span>
            </button>

            <button
              onClick={loadData}
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5"
              title="Ouvrir la vitrine dans un nouvel onglet"
            >
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Vitrine</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* FIL D'ARIANE, TITRE DE SECTION ET ONGLETS HORIZONTAUX */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
            <div>
              {/* Fil d'ariane dynamique */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <span>Atelier Pro Admin</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="text-slate-900 font-bold capitalize">
                  {activeTab === 'analytics' && 'Tableau de bord & Analyses'}
                  {activeTab === 'orders' && 'Commandes Récentes'}
                  {activeTab === 'products' && 'Catalogue Produits & Liens Ads'}
                  {activeTab === 'promotions' && 'Promotions Flash & Lots'}
                  {activeTab === 'reviews' && 'Avis & Modération'}
                  {activeTab === 'whatsapp' && 'Alertes WhatsApp Directes'}
                </span>
              </div>

              {/* Titre & Sous-titre de l'onglet actif */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <span>
                  {activeTab === 'analytics' && 'Tableau de Bord & Analyses'}
                  {activeTab === 'orders' && `Commandes Clients (${orders.length})`}
                  {activeTab === 'products' && `Catalogue Produits (${products.length})`}
                  {activeTab === 'promotions' && `Promotions & Volume Breaks (${promotions.length})`}
                  {activeTab === 'reviews' && `Avis Clients (${adminReviews.length})`}
                  {activeTab === 'whatsapp' && 'Configuration des Alertes WhatsApp Directes'}
                </span>
                {activeTab === 'orders' && pendingOrdersCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {pendingOrdersCount} à traiter
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === 'analytics' && 'Indicateurs clés, chiffre d\'affaires, étapes du tunnel et provenance du trafic.'}
                {activeTab === 'orders' && 'Suivi des commandes expédiées au Bénin, validation d\'adresses et numéros de colis.'}
                {activeTab === 'products' && 'Gestion des stocks physiques, prix et copie 1-clic des liens pour vos campagnes pub.'}
                {activeTab === 'promotions' && 'Offres spéciales à quota limité et configuration du widget de lots dégressifs.'}
                {activeTab === 'reviews' && 'Modération des avis soumis par les clients avant publication sur la fiche produit.'}
                {activeTab === 'whatsapp' && 'Recevez automatiquement un message sur-mesure sur WhatsApp pour chaque nouvelle commande.'}
              </p>
            </div>

            {/* Actions contextuelles rapides dans l'en-tête */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'orders' && (
                <button
                  onClick={exportOrdersCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exporter CSV</span>
                </button>
              )}

              {activeTab === 'products' && (
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau Produit</span>
                </Link>
              )}

              {activeTab === 'promotions' && (
                <button
                  onClick={() => setShowPromoModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouvelle Promotion</span>
                </button>
              )}
            </div>
          </div>

          {/* Barre d'onglets horizontaux de repérage rapide */}
          <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              onClick={() => handleTabChange('analytics')}
              className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-[#008060] text-[#008060]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Vue d&apos;ensemble</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Shopify
              </span>
            </button>
            <button
              onClick={() => handleTabChange('orders')}
              className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Commandes</span>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('products')}
              className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Produits & Liens Pub</span>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {products.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('reviews')}
              className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Avis Clients</span>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {adminReviews.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('promotions')}
              className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'promotions'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Promotions & Lots</span>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {promotions.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('whatsapp')}
              className={`pb-3 px-4 text-xs font-black transition border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Alertes WhatsApp</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Direct
              </span>
            </button>
          </div>

          {/* KPI CARDS (Affichés sur les onglets secondaires) */}
          {activeTab !== 'analytics' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Commandes Reçues</div>
                  <div className="text-2xl font-black text-slate-900">{orders.length}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chiffre d&apos;Affaires</div>
                  <div className="text-2xl font-black text-slate-900">{formatFCFA(totalRevenue)}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Articles au Catalogue</div>
                  <div className="text-2xl font-black text-slate-900">{products.length}</div>
                </div>
              </div>
            </div>
          )}

        {/* TAB 0: SHOPIFY ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && <ShopifyAnalyticsDashboard />}

        {/* TAB 1: ORDERS MANAGER */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* TOOLBAR FILTRES, RECHERCHE & EXPORT CSV */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Recherche */}
                <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Téléphone, n° commande, nom..."
                    className="w-full text-xs font-medium rounded-xl border border-slate-300 pl-9 pr-8 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title="Effacer la recherche"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtre par Statut */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-bold rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">Tous les statuts ({orders.length})</option>
                  <option value="nouvelle">Nouvelles</option>
                  <option value="en_preparation">En préparation</option>
                  <option value="expediee">Expédiées</option>
                  <option value="livree">Livrées</option>
                  <option value="annulee">Annulées</option>
                </select>

                {/* Filtre par Source Publicitaire (UTM) */}
                <select
                  value={utmFilter}
                  onChange={(e) => setUtmFilter(e.target.value)}
                  className="text-xs font-bold rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">Toutes les sources pub</option>
                  {availableUtmSources.map((src) => (
                    <option key={src} value={src}>
                      Source : {src.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bouton Export CSV */}
              <button
                onClick={exportOrdersCSV}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Exporter CSV ({filteredOrders.length})</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 stroke-1" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Aucune commande pour le moment</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Passez une commande test sur la boutique pour voir l&apos;alerte push et la commande s&apos;afficher ici.
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 stroke-1" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Aucun résultat trouvé</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Aucune commande ne correspond aux critères de recherche et filtres actuels.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setUtmFilter('all');
                  }}
                  className="text-xs font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {order.order_number}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(order.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        Client : {order.customer_name} •{' '}
                        <a href={`tel:${order.customer_phone}`} className="text-blue-600 underline">
                          {order.customer_phone}
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 inline mr-1 -mt-0.5" />
                        <strong>{order.shipping_city}</strong> {order.neighborhood ? `— ${order.neighborhood}` : ''}
                        {order.landmark && (
                          <span className="block text-slate-500 font-medium">Repère : {order.landmark}</span>
                        )}
                        {order.location_url && (
                          <a
                            href={order.location_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline inline-flex items-center gap-1 text-[10px] mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Voir localisation GPS</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{formatFCFA(order.total_price)}</div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {order.carrier}
                      </span>
                      {(order.utm_source || order.utm_campaign) && (
                        <div className="text-[9px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded mt-1">
                          Source : {order.utm_source || 'direct'} {order.utm_campaign ? `(${order.utm_campaign})` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">Articles commandés :</span>
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between font-semibold">
                          <span>{it.quantity}x {it.product_name}</span>
                          <span className="font-mono">{formatFCFA(it.product_price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions: Status update & Tracking Number & WhatsApp Direct */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-600">Statut :</span>
                      <select
                        value={statusDrafts[order.id] || order.status}
                        onChange={(e) => {
                          setStatusDrafts({ ...statusDrafts, [order.id]: e.target.value });
                          updateOrderStatus(order.id, e.target.value);
                        }}
                        className="text-xs font-extrabold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="nouvelle">Nouvelle</option>
                        <option value="en_preparation">En préparation</option>
                        <option value="expediee">Expédiée</option>
                        <option value="livree">Livrée</option>
                        <option value="annulee">Annulée</option>
                      </select>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `🚨 *COMMANDE REÇUE — ${order.order_number}*\n\n` +
                          `👤 *Client :* ${order.customer_name}\n` +
                          `📞 *Téléphone :* ${order.customer_phone}\n` +
                          `📍 *Livraison :* ${order.shipping_city} ${order.neighborhood ? `(${order.neighborhood})` : ''} ${order.landmark ? `— Repère: ${order.landmark}` : ''}\n\n` +
                          `🛍️ *Articles :*\n${(order.items || []).map((it) => `• ${it.quantity}x ${it.product_name} (${formatFCFA(it.product_price * it.quantity)})`).join('\n')}\n\n` +
                          `💰 *Total à encaisser :* ${formatFCFA(order.total_price)} (Espèces)`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                        title="Ouvrir le récapitulatif pré-formaté sur WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Partager WhatsApp</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <input
                        type="text"
                        placeholder="N° suivi colis (ex: 6A123456)"
                        defaultValue={order.tracking_number || ''}
                        onChange={(e) => setTrackingDrafts({ ...trackingDrafts, [order.id]: e.target.value })}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                      <button
                        onClick={() => updateOrderTracking(order.id)}
                        className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS & ADVERTISING LINKS */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Gestion du Catalogue & des Stocks
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajustez vos prix en FCFA, gérez vos stocks en direct et ajoutez de nouveaux articles.
                </p>
              </div>
              <Link
                href="/admin/products/new"
                className="bg-[#008060] hover:bg-[#006e52] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un produit (Style Shopify)</span>
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {products.map((product) => (
                <div key={product.id} className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Info Produit */}
                  <div className="flex items-center gap-3.5 min-w-[240px]">
                    <img
                      src={product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                      alt={product.name}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        {product.category}
                      </span>
                      <h3 className="text-xs font-black text-slate-900 leading-snug">{product.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">slug: /{product.slug}</span>
                    </div>
                  </div>

                  {/* Contrôles Prix, Stock & Statut en direct */}
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    {/* Édition Prix */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Prix :</span>
                      <input
                        type="number"
                        defaultValue={product.price}
                        onChange={(e) => setPriceInputs({ ...priceInputs, [product.id]: Number(e.target.value) })}
                        className="w-24 text-xs font-black px-2 py-1 rounded-lg border border-slate-300 bg-white"
                      />
                      <span className="text-xs font-bold text-slate-600">FCFA</span>
                      {priceInputs[product.id] !== undefined && priceInputs[product.id] !== product.price && (
                        <button
                          onClick={() => handleUpdateProduct(product.id, { price: priceInputs[product.id] })}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold p-1 rounded transition cursor-pointer"
                          title="Enregistrer le nouveau prix"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Édition Stock */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">Stock :</span>
                      <input
                        type="number"
                        defaultValue={product.stock}
                        onChange={(e) => setStockInputs({ ...stockInputs, [product.id]: Number(e.target.value) })}
                        className="w-16 text-xs font-black px-2 py-1 rounded-lg border border-slate-300 bg-white"
                      />
                      {stockInputs[product.id] !== undefined && stockInputs[product.id] !== product.stock && (
                        <button
                          onClick={() => handleUpdateProduct(product.id, { stock: stockInputs[product.id] })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold p-1 rounded transition cursor-pointer"
                          title="Enregistrer le stock"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sélecteur de Statut */}
                    <select
                      value={product.status || 'active'}
                      onChange={(e) => handleUpdateProduct(product.id, { status: e.target.value })}
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border cursor-pointer ${
                        product.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : product.status === 'draft'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      <option value="active">En vente (Actif)</option>
                      <option value="draft">Masqué (Brouillon)</option>
                      <option value="archived">Archivé</option>
                    </select>
                  </div>

                  {/* Actions Marketing & Suppression */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-xl transition shadow-2xs flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </Link>
                    <Link
                      href={`/produit/${product.slug}`}
                      target="_blank"
                      className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
                    >
                      Aperçu
                    </Link>
                    <button
                      onClick={() => copyAdLink(product.slug, product.name)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Lien pub</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Retirer cet article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* TAB 3: REVIEWS MODERATION & SOCIAL PROOF */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-base text-slate-900">Avis Clients & Social Proof</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Boutique Bénin
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gérez les témoignages de vos clients ou ajoutez de nouveaux avis réalistes pour booster vos conversions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {adminReviews.length} avis au total
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateReviewModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un avis client</span>
                </button>
              </div>
            </div>

            {adminReviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6 stroke-1" />
                </div>
                <p className="font-bold text-sm text-slate-700">Aucun avis enregistré pour le moment.</p>
                <p className="text-xs text-slate-400">
                  Créez votre premier avis client pour afficher des témoignages rassurants sur vos fiches produits.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateReviewModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer un avis maintenant</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {adminReviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center hover:border-slate-300 transition">
                    <div className="space-y-1.5 text-xs max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{rev.customer_name}</span>
                        <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          📍 {rev.city}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          rev.status === 'approuve' ? 'bg-emerald-100 text-emerald-800' :
                          rev.status === 'rejete' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rev.status === 'approuve' ? '✓ En ligne (Approuvé)' : rev.status === 'rejete' ? 'Rejeté' : 'En attente'}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        {rev.comment}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="font-bold text-slate-600">
                          {rev.product_name ? `📦 ${rev.product_name}` : '🏬 Avis général vitrine'}
                        </span>
                        <span>•</span>
                        <span>{new Date(rev.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {rev.status !== 'approuve' && (
                        <button
                          type="button"
                          onClick={() => handleModerateReview(rev.id, 'approuve')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approuver</span>
                        </button>
                      )}
                      {rev.status !== 'rejete' && (
                        <button
                          type="button"
                          onClick={() => handleModerateReview(rev.id, 'rejete')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rejeter</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                        title="Supprimer définitivement cet avis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROMOTIONS & LIMITED QUOTAS */}
        {activeTab === 'promotions' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Offres Promotionnelles & Quotas Limités</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Fixez un quota précis d&apos;unités qui bénéficieront d&apos;un prix promotionnel. Dès que le quota est consommé, le site bascule <strong>automatiquement</strong> sur le tarif normal sans survente.
                </p>
              </div>
              <button
                onClick={() => {
                  if (products.length > 0) {
                    const first = products[0];
                    setPromoForm({
                      product_id: String(first.id),
                      name: 'Offre Limitée — Vente Flash',
                      original_price: String(first.price),
                      promo_price: String(Math.round(first.price * 0.8)),
                      total_quota: String(Math.min(10, first.stock || 5)),
                      start_date: '',
                      end_date: '',
                      status: 'active',
                      show_remaining: true,
                    });
                  }
                  setShowPromoModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Promotion</span>
              </button>
            </div>

            {promotions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-6 h-6 stroke-1" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Aucune offre promotionnelle enregistrée</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Créez une offre promotionnelle avec stock limité pour doper vos conversions avec paiement à la livraison au Bénin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map((promo) => {
                  const remaining = Math.max(0, promo.total_quota - promo.consumed_quota);
                  const percentSold = promo.total_quota > 0 ? Math.round((promo.consumed_quota / promo.total_quota) * 100) : 0;
                  const discount = promo.original_price > 0 ? Math.round(((promo.original_price - promo.promo_price) / promo.original_price) * 100) : 0;
                  const isExhausted = remaining === 0;

                  return (
                    <div
                      key={promo.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                              {promo.product_name}
                            </span>
                            <h3 className="text-sm font-black text-slate-900 mt-1">{promo.name}</h3>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                              promo.status === 'active' && !isExhausted
                                ? 'bg-emerald-100 text-emerald-800'
                                : promo.status === 'paused'
                                ? 'bg-amber-100 text-amber-800'
                                : promo.status === 'draft'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isExhausted ? 'Quota Épuisé' : promo.status === 'active' ? 'En cours' : promo.status === 'paused' ? 'Suspendue' : promo.status === 'draft' ? 'Brouillon' : 'Terminée'}
                          </span>
                        </div>

                        {/* Tarifs */}
                        <div className="flex items-baseline gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                          <span className="text-lg font-black text-amber-600">{formatFCFA(promo.promo_price)}</span>
                          <span className="text-xs text-slate-400 line-through font-medium">{formatFCFA(promo.original_price)}</span>
                          <span className="text-[11px] font-extrabold text-white bg-slate-900 px-2 py-0.5 rounded-full">
                            -{discount}%
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 ml-auto">
                            Économie: {formatFCFA(promo.original_price - promo.promo_price)}
                          </span>
                        </div>

                        {/* Barre de quota */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>Unités vendues : {promo.consumed_quota} / {promo.total_quota}</span>
                            <span className={remaining <= 3 && remaining > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-600'}>
                              {remaining === 0 ? 'Offre épuisée (prix normal actif)' : `Reste ${remaining} unité${remaining > 1 ? 's' : ''}`}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isExhausted ? 'bg-slate-400' : percentSold > 75 ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, percentSold)}%` }}
                            />
                          </div>
                        </div>

                        {/* Paramètres additionnels */}
                        <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                          <div>
                            Stock physique total actuel : <strong>{promo.product_stock} unités</strong>
                          </div>
                          {promo.start_date && (
                            <div>Début : {new Date(promo.start_date).toLocaleString('fr-FR')}</div>
                          )}
                          {promo.end_date && (
                            <div>Fin : {new Date(promo.end_date).toLocaleString('fr-FR')}</div>
                          )}
                          <div>
                            Affichage du compteur client : <strong>{promo.show_remaining ? 'Oui' : 'Non'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex gap-1.5">
                          {promo.status === 'active' ? (
                            <button
                              onClick={() => handleUpdatePromoStatus(promo.id, 'paused')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Mettre en pause</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdatePromoStatus(promo.id, 'active')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Activer l&apos;offre</span>
                            </button>
                          )}
                          {promo.status !== 'ended' && (
                            <button
                              onClick={() => handleUpdatePromoStatus(promo.id, 'ended')}
                              className="px-2.5 py-1.5 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            >
                              Clôturer
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeletePromo(promo.id)}
                          className="px-2.5 py-1.5 rounded-lg font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECTION CONFIGURATION DU WIDGET QUANTITY BREAKS (STYLE SHOPIFY) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 mt-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-sm">
                      <Sliders className="w-4 h-4 text-amber-600" />
                    </span>
                    <h2 className="text-base font-black text-slate-900">
                      Configuration du Widget Quantity Breaks (Style Shopify)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Personnalisez les offres par quantité, choisissez l&apos;offre mise en avant avec le badge <strong>« PLUS POPULAIRE »</strong>, et testez le rendu en direct.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveQbSettings}
                  disabled={savingQb}
                  className="bg-slate-900 hover:bg-black text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingQb ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Enregistrer les Réglages</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* FORMULAIRE DES PARAMÈTRES (7 COLONNES) */}
                <div className="lg:col-span-7 space-y-5 text-xs">
                  {/* Switch Activation Générale */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Afficher les cartes de promotion par quantité
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Affiche les packs sélectionnables (1, 2, 3 articles) sur les fiches produits.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qbSettings.qb_enabled === '1'}
                        onChange={(e) =>
                          setQbSettings((s) => ({ ...s, qb_enabled: e.target.checked ? '1' : '0' }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {/* CHOIX DES 3 TEMPLATES DE STYLES */}
                  <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <label className="font-black text-slate-900 block flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-slate-700" />
                        <span>Template de Style du Widget (3 Options Shopify)</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                        Design UI
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Sélectionnez la présentation qui correspond à l&apos;identité visuelle de votre boutique.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {[
                        {
                          id: 'modern',
                          name: 'Modern Bold',
                          desc: 'Inspiration Shopify Polaris, cartes en relief, badges vifs',
                          icon: <Zap className="w-4 h-4 text-amber-500 shrink-0" />,
                        },
                        {
                          id: 'prestige',
                          name: 'Prestige Luxe',
                          desc: 'Atelier Pro, ivoire & or, ambiance bijouterie et haute joaillerie',
                          icon: <Crown className="w-4 h-4 text-amber-600 shrink-0" />,
                        },
                        {
                          id: 'compact',
                          name: 'Clean Compact',
                          desc: 'Format dense, rapide, idéal pour optimiser le scroll sur smartphone',
                          icon: <Smartphone className="w-4 h-4 text-slate-700 shrink-0" />,
                        },
                      ].map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setQbSettings((s) => ({ ...s, qb_template: tpl.id }))}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            qbSettings.qb_template === tpl.id
                              ? 'bg-white border-2 text-slate-900 shadow-sm ring-2 ring-slate-900/10'
                              : 'bg-white/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                          style={
                            qbSettings.qb_template === tpl.id
                              ? { borderColor: qbSettings.qb_accent_color || '#C27835' }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs">
                            {tpl.icon}
                            <span>{tpl.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            {tpl.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CHOIX DE LA COULEUR D'ACCENTUATION */}
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-black text-slate-900 block text-xs flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-slate-700" />
                          <span>Couleur d&apos;Accentuation du Widget</span>
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Pilote les bordures actives, boutons d&apos;action, badges et lueurs.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full border border-black/10 shadow-xs inline-block"
                          style={{ backgroundColor: qbSettings.qb_accent_color || '#C27835' }}
                        />
                        <span className="font-mono text-xs font-bold text-slate-700 uppercase">
                          {qbSettings.qb_accent_color || '#C27835'}
                        </span>
                      </div>
                    </div>

                    {/* Nuancier de palettes rapides + Custom Picker */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {[
                        { name: 'Or Atelier', hex: '#C27835' },
                        { name: 'Vert Polaris', hex: '#008060' },
                        { name: 'Bleu Royal', hex: '#2563EB' },
                        { name: 'Noir Ébène', hex: '#121316' },
                        { name: 'Rouge Flash', hex: '#DC2626' },
                        { name: 'Violet Luxe', hex: '#7C3AED' },
                      ].map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setQbSettings((s) => ({ ...s, qb_accent_color: color.hex }))}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                            qbSettings.qb_accent_color?.toLowerCase() === color.hex.toLowerCase()
                              ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </button>
                      ))}

                      {/* Color Picker HTML5 Personnalisé */}
                      <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white">
                        <input
                          type="color"
                          value={qbSettings.qb_accent_color || '#C27835'}
                          onChange={(e) => setQbSettings((s) => ({ ...s, qb_accent_color: e.target.value }))}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                          title="Choisir une couleur personnalisée"
                        />
                        <input
                          type="text"
                          value={qbSettings.qb_accent_color || '#C27835'}
                          onChange={(e) => setQbSettings((s) => ({ ...s, qb_accent_color: e.target.value }))}
                          placeholder="#HEX"
                          className="w-16 font-mono text-[11px] uppercase font-bold text-slate-800 bg-transparent border-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Choix de l'offre définie avec le badge « PLUS POPULAIRE » */}
                  <div className="space-y-2 p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <label className="font-black text-slate-900 block flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>Offre avec le badge « PLUS POPULAIRE » (Choix Administrateur)</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Exclusivité Admin
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-600">
                      Définissez quelle carte affichera le badge officiel de mise en avant pour guider le choix du client.
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { q: '1', title: '1 Article', sub: 'Achat unique' },
                        { q: '2', title: 'Lot de 2', sub: 'Recommandé' },
                        { q: '3', title: 'Lot de 3', sub: 'Pack Famille' },
                      ].map((item) => (
                        <button
                          key={item.q}
                          type="button"
                          onClick={() => setQbSettings((s) => ({ ...s, qb_popular_tier: item.q }))}
                          className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                            qbSettings.qb_popular_tier === item.q
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="font-black block">{item.title}</span>
                          <span className={`text-[10px] block ${qbSettings.qb_popular_tier === item.q ? 'text-amber-100' : 'text-slate-500'}`}>
                            {item.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Libellés et Textes des Badges */}
                  <div className="space-y-4 pt-2">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Personnalisation des Intitulés & Badges
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Texte du Badge Populaire
                        </label>
                        <input
                          type="text"
                          value={qbSettings.qb_tier2_badge}
                          onChange={(e) =>
                            setQbSettings((s) => ({ ...s, qb_tier2_badge: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="PLUS POPULAIRE"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Texte du Badge Pack 3
                        </label>
                        <input
                          type="text"
                          value={qbSettings.qb_tier3_badge}
                          onChange={(e) =>
                            setQbSettings((s) => ({ ...s, qb_tier3_badge: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="MAXIMUM D’ÉCONOMIE"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 block text-[11px]">
                          Pack 2 (Offre Recommandée)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={qbSettings.qb_tier2_label}
                            onChange={(e) =>
                              setQbSettings((s) => ({ ...s, qb_tier2_label: e.target.value }))
                            }
                            placeholder="Titre : Lot de 2 Articles"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                          <input
                            type="text"
                            value={qbSettings.qb_tier2_subtitle}
                            onChange={(e) =>
                              setQbSettings((s) => ({ ...s, qb_tier2_subtitle: e.target.value }))
                            }
                            placeholder="Sous-titre : Le Pack Duo Privilège"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 block text-[11px]">
                          Pack 3 (Offre Famille / Trio)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={qbSettings.qb_tier3_label}
                            onChange={(e) =>
                              setQbSettings((s) => ({ ...s, qb_tier3_label: e.target.value }))
                            }
                            placeholder="Titre : Lot de 3 Articles"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                          <input
                            type="text"
                            value={qbSettings.qb_tier3_subtitle}
                            onChange={(e) =>
                              setQbSettings((s) => ({ ...s, qb_tier3_subtitle: e.target.value }))
                            }
                            placeholder="Sous-titre : Pack Famille & Cadeaux"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* APERÇU EN DIRECT INTERACTIF (5 COLONNES) */}
                <div className="lg:col-span-5 bg-[#FAF9F6] p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-slate-700" />
                      <span>Aperçu Client en Temps Réel</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                      Interactif
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Voici exactement comment le widget apparaît pour un client sur son smartphone avec le template et la couleur sélectionnés :
                  </p>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <QuantityBreaksWidget
                      currentQuantity={previewQty}
                      onSelectQuantity={(q) => setPreviewQty(q)}
                      productPrice={18900}
                      originalPrice={25000}
                      promoPrice={15900}
                      promoRemainingQuota={10}
                      stock={15}
                      popularTier={Number(qbSettings.qb_popular_tier) || 2}
                      template={(qbSettings.qb_template as any) || 'modern'}
                      accentColor={qbSettings.qb_accent_color || '#C27835'}
                      customLabels={{
                        tier1Label: qbSettings.qb_tier1_label,
                        tier2Label: qbSettings.qb_tier2_label,
                        tier3Label: qbSettings.qb_tier3_label,
                        tier2Subtitle: qbSettings.qb_tier2_subtitle,
                        tier3Subtitle: qbSettings.qb_tier3_subtitle,
                        tier2Badge: qbSettings.qb_tier2_badge,
                        tier3Badge: qbSettings.qb_tier3_badge,
                      }}
                      onProceedToOrder={() => {
                        showToast(`Simulation clic "Commander cette offre" (quantité : ${previewQty})`, 'info');
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS WHATSAPP DIRECTES */}
        {activeTab === 'whatsapp' && (
          <WhatsAppSettingsTab showToast={showToast} />
        )}
        </div>
      </div>

      {/* COMMAND PALETTE (Raccourci Universel Ctrl+K / Cmd+K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-14 sm:pt-20 px-4 animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
          >
            {/* Header avec Input */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher commande, produit, client ou section..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                className="w-full text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Corps des résultats */}
            <div className="overflow-y-auto p-3 space-y-4 divide-y divide-slate-100">
              
              {/* 1. Modules de Navigation Rapide */}
              {paletteResults.navModules.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Sections de l&apos;Administration
                  </div>
                  <div className="space-y-1">
                    {paletteResults.navModules.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            handleTabChange(m.id);
                            setCommandPaletteOpen(false);
                            setPaletteQuery('');
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                            activeTab === m.id
                              ? 'bg-blue-50 text-blue-900 border border-blue-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{m.title}</div>
                              <div className="text-[10px] text-slate-500">{m.desc}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-md">
                            Aller →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Commandes Correspondantes */}
              {paletteResults.matchedOrders.length > 0 && (
                <div className="pt-3 space-y-1">
                  <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Commandes Trouvées</span>
                    <span className="text-[9px] text-slate-400">Cliquez pour ouvrir</span>
                  </div>
                  <div className="space-y-1">
                    {paletteResults.matchedOrders.map((ord) => (
                      <button
                        key={ord.id}
                        onClick={() => {
                          handleTabChange('orders');
                          setSearchQuery(ord.order_number);
                          setCommandPaletteOpen(false);
                          setPaletteQuery('');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-left transition cursor-pointer border border-transparent hover:border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            CMD
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {ord.order_number} — {ord.customer_name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {ord.customer_phone} • {ord.shipping_city}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">{formatFCFA(ord.total_price)}</div>
                          <span className="text-[9px] font-bold uppercase text-slate-500">
                            {ord.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Produits Correspondants */}
              {paletteResults.matchedProducts.length > 0 && (
                <div className="pt-3 space-y-1">
                  <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Produits au Catalogue</span>
                    <span className="text-[9px] text-slate-400">Cliquez pour voir</span>
                  </div>
                  <div className="space-y-1">
                    {paletteResults.matchedProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          handleTabChange('products');
                          setCommandPaletteOpen(false);
                          setPaletteQuery('');
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-left transition cursor-pointer border border-transparent hover:border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {p.category} • Stock: {p.stock}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">{formatFCFA(p.price)}</div>
                          <span className="text-[9px] font-bold text-blue-600">
                            Voir le produit →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Actions Rapides */}
              <div className="pt-3 space-y-1">
                <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Actions Rapides
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/admin/products/new"
                    onClick={() => setCommandPaletteOpen(false)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Créer un produit</span>
                  </Link>

                  <button
                    onClick={() => {
                      setShowPromoModal(true);
                      setCommandPaletteOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition text-left cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lancer une promo</span>
                  </button>

                  <button
                    onClick={() => {
                      exportOrdersCSV();
                      setCommandPaletteOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition text-left cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exporter CSV</span>
                  </button>

                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setCommandPaletteOpen(false)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ouvrir boutique</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>
          {/* Backdrop click */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setCommandPaletteOpen(false)}
          />
        </div>
      )}

      {/* NAVIGATION BASSE MOBILE COMPACTE (Accès pouce sur smartphone) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around py-2 px-3 text-[10px] font-bold text-slate-500 shadow-lg">
        <button
          onClick={() => handleTabChange('analytics')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'analytics' ? 'text-blue-600 font-black' : 'hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analyses</span>
        </button>

        <button
          onClick={() => handleTabChange('orders')}
          className={`relative flex flex-col items-center gap-1 transition ${
            activeTab === 'orders' ? 'text-blue-600 font-black' : 'hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Commandes</span>
          {pendingOrdersCount > 0 && (
            <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('products')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'products' ? 'text-blue-600 font-black' : 'hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produits</span>
        </button>

        <button
          onClick={() => handleTabChange('promotions')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'promotions' ? 'text-amber-600 font-black' : 'hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Promos</span>
        </button>

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-slate-900"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </nav>

      {/* MODAL AJOUT D'UN NOUVEAU PRODUIT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Ajouter un nouvel article</h3>
                <p className="text-xs text-slate-500">Renseignez les détails pour publier l&apos;article en boutique.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de l&apos;article *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Chaussures Richelieu Cuir Vintage"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix de vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="ex: 18900"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stock initial disponible *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="ex: 10"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catégorie
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ex: Maroquinerie, Montres, Chaussures..."
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['Maroquinerie', 'Montres', 'Audio', 'Chaussures', 'Accessoires'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewProductForm({ ...newProductForm, category: cat })}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL de l&apos;image du produit
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... ou /images/..."
                  value={newProductForm.image_url}
                  onChange={(e) => setNewProductForm({ ...newProductForm, image_url: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description courte
                </label>
                <textarea
                  rows={3}
                  placeholder="Détails, matériaux, confection, caractéristiques..."
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Publier l&apos;article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL NOUVELLE PROMOTION */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Nouvelle Offre à Quota Limité</h3>
                <p className="text-xs text-slate-500">Configurez le prix réduit et le nombre d&apos;unités éligibles.</p>
              </div>
              <button
                onClick={() => setShowPromoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4 mt-4">
              {/* Choix du produit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Produit concerné *
                </label>
                <select
                  required
                  value={promoForm.product_id}
                  onChange={(e) => {
                    const selId = Number(e.target.value);
                    const prod = products.find((p) => p.id === selId);
                    setPromoForm({
                      ...promoForm,
                      product_id: e.target.value,
                      original_price: prod ? String(prod.price) : promoForm.original_price,
                      promo_price: prod ? String(Math.round(prod.price * 0.8)) : promoForm.promo_price,
                      total_quota: prod ? String(Math.min(10, prod.stock || 5)) : promoForm.total_quota,
                    });
                  }}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-bold"
                >
                  <option value="">Sélectionner un produit...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Prix: {formatFCFA(p.price)} • Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nom de la promo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom public de l&apos;offre *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Vente Flash Ouverture, Promo Spéciale..."
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                />
              </div>

              {/* Tarifs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix de référence normal (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="6100"
                    value={promoForm.original_price}
                    onChange={(e) => setPromoForm({ ...promoForm, original_price: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix promotionnel (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="4900"
                    value={promoForm.promo_price}
                    onChange={(e) => setPromoForm({ ...promoForm, promo_price: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-black text-amber-600"
                  />
                </div>
              </div>

              {/* Quota */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quota d&apos;unités éligibles au prix promo *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ex: 12"
                  value={promoForm.total_quota}
                  onChange={(e) => setPromoForm({ ...promoForm, total_quota: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-black"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ne peut pas excéder le stock physique disponible.
                </span>
              </div>

              {/* Dates optionnelles */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date début (facultatif)
                  </label>
                  <input
                    type="datetime-local"
                    value={promoForm.start_date}
                    onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date fin (facultatif)
                  </label>
                  <input
                    type="datetime-local"
                    value={promoForm.end_date}
                    onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Indicateur de compteur */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={promoForm.show_remaining}
                  onChange={(e) => setPromoForm({ ...promoForm, show_remaining: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Afficher le nombre d&apos;unités restantes sur la fiche produit
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Lancer la promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL CRÉATION D'AVIS CLIENT MANUEL PAR L'ADMIN */}
      {showCreateReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>Créer un avis client</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajoutez un témoignage réaliste pour mettre en valeur vos produits et rassurer vos acheteurs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateReviewModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cible de l&apos;avis
                </label>
                <select
                  value={newReviewForm.productId === null ? '' : newReviewForm.productId}
                  onChange={(e) =>
                    setNewReviewForm({
                      ...newReviewForm,
                      productId: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                >
                  <option value="">Avis général vitrine (Boutique)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prénom & Nom du client *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rodrigue K."
                    value={newReviewForm.customerName}
                    onChange={(e) => setNewReviewForm({ ...newReviewForm, customerName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ville (Bénin) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cotonou (Haie Vive)"
                    value={newReviewForm.city}
                    onChange={(e) => setNewReviewForm({ ...newReviewForm, city: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Note en étoiles *
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewForm({ ...newReviewForm, rating: star })}
                        className="cursor-pointer hover:scale-110 transition"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= newReviewForm.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-extrabold text-amber-600 ml-1">
                      {newReviewForm.rating}/5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Statut initial
                  </label>
                  <select
                    value={newReviewForm.status}
                    onChange={(e) => setNewReviewForm({ ...newReviewForm, status: e.target.value as 'approuve' | 'en_attente' })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium"
                  >
                    <option value="approuve">Approuvé (visible immédiatement)</option>
                    <option value="en_attente">En attente de modération</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commentaire / Témoignage client *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Livraison très rapide à mon domicile. Le produit est conforme aux photos, j'ai vérifié avant de payer au coursier..."
                  value={newReviewForm.comment}
                  onChange={(e) => setNewReviewForm({ ...newReviewForm, comment: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-blue-500 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateReviewModal(false)}
                  className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingReview}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{creatingReview ? 'Création...' : 'Publier l\'avis'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
