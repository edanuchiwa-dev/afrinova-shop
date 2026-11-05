'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Package,
  MapPin,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Users,
  Eye,
  Activity,
  Smartphone,
  Monitor,
  Radio,
  Zap,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Search,
  Download,
  Wifi,
  Navigation,
  Compass,
  Trash2
} from 'lucide-react';
import { formatFCFA } from '@/lib/format';

type TimePoint = {
  date: string;
  label: string;
  sales: number;
  orders: number;
  visitors: number;
  pageviews: number;
  prevSales: number;
  prevOrders: number;
  prevVisitors: number;
};

type LiveVisitor = {
  sessionId: string;
  path: string;
  title: string;
  device: string;
  ipAddress: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  latitude?: number | null;
  longitude?: number | null;
  userAgent?: string;
  browser?: string;
  utmSource: string;
  createdAt: string;
  lastHeartbeat: string;
  durationSec: number;
  lastSeenSec: number;
};

type LiveVisitorStats = {
  activeCount: number;
  activeVisitors: LiveVisitor[];
  recentVisitors: LiveVisitor[];
  activePages: Array<{ path: string; label: string; count: number; percentage: number }>;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  last30Minutes: Array<{ minuteLabel: string; visitors: number }>;
  todayVisitorsCount: number;
  todayPageViewsCount: number;
};

type AnalyticsData = {
  range: string;
  kpis: {
    totalSales: number;
    totalSalesChange: number;
    prevSales: number;
    totalOrders: number;
    totalOrdersChange: number;
    prevOrders: number;
    aov: number;
    aovChange: number;
    prevAov: number;
    returningCustomerRate: number;
    uniqueCustomers: number;
    returningCustomers: number;
    totalVisitors?: number;
    totalVisitorsChange?: number;
    prevVisitors?: number;
    totalPageViews?: number;
    conversionRate?: number;
    conversionRateChange?: number;
    prevConversionRate?: number;
  };
  timeSeries: TimePoint[];
  topProducts: Array<{
    name: string;
    units: number;
    revenue: number;
    share: number;
    image: string | null;
  }>;
  channels: Array<{
    key: string;
    label: string;
    revenue: number;
    orders: number;
    color: string;
    share: number;
  }>;
  geography: Array<{
    name: string;
    revenue: number;
    count: number;
    share: number;
  }>;
  fulfillmentStatus: {
    unfulfilled: number;
    fulfilled: number;
    cancelled: number;
    total: number;
  };
};

export default function ShopifyAnalyticsDashboard() {
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d' | 'ytd'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<'sales' | 'orders' | 'visitors'>('sales');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(true);

  // Données Live View en temps réel
  const [liveData, setLiveData] = useState<LiveVisitorStats | null>(null);
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(true);
  const [lastRefreshedSec, setLastRefreshedSec] = useState(0);

  // États pour le journal des visiteurs & audit IP
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [visitorSearchQuery, setVisitorSearchQuery] = useState('');
  const [visitorFilterTab, setVisitorFilterTab] = useState<'all' | 'live' | 'mobile' | 'desktop'>('all');

  const handleCopyIp = (ip: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const exportVisitorsCsv = (visitors: LiveVisitor[]) => {
    if (!visitors || visitors.length === 0) return;
    const headers = [
      'Session ID',
      'Adresse IP',
      'Ville',
      'Région',
      'Pays',
      'Opérateur / FAI',
      'Terminal',
      'Navigateur / App',
      'Page consultée',
      'Source UTM',
      'Date / Heure',
      'Durée (sec)',
      'Latitude',
      'Longitude',
    ];
    const rows = visitors.map((v) => [
      v.sessionId,
      v.ipAddress,
      v.city,
      v.region,
      v.country,
      v.isp,
      v.device,
      v.browser || 'Web',
      v.path,
      v.utmSource || 'direct',
      v.createdAt,
      v.durationSec,
      v.latitude || '',
      v.longitude || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `journal_visiteurs_ip_atelier_pro_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isCleaningVisitors, setIsCleaningVisitors] = useState(false);

  const fetchLiveVisitors = async () => {
    try {
      const res = await fetch('/api/admin/live-visitors');
      if (res.ok) {
        const json = await res.json();
        setLiveData(json);
        setLastRefreshedSec(0);
      }
    } catch (err) {
      console.error('Erreur live visitors:', err);
    }
  };

  const handleCleanFakeVisitors = async () => {
    if (!confirm('Supprimer toutes les fausses connexions (robots, crawlers et tests locaux) ?')) return;
    try {
      setIsCleaningVisitors(true);
      const res = await fetch('/api/admin/live-visitors?action=purge_fake', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        fetchLiveVisitors();
      }
    } catch (err) {
      console.error('Erreur nettoyage:', err);
    } finally {
      setIsCleaningVisitors(false);
    }
  };

  const handleDeleteVisitorSession = async (sessionId: string) => {
    if (!confirm('Supprimer cette session du journal ?')) return;
    try {
      const res = await fetch(`/api/admin/live-visitors?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        fetchLiveVisitors();
      }
    } catch (err) {
      console.error('Erreur suppression session:', err);
    }
  };

  useEffect(() => {
    fetchLiveVisitors();
    if (!liveAutoRefresh) return;
    const interval = setInterval(fetchLiveVisitors, 4000);
    return () => clearInterval(interval);
  }, [liveAutoRefresh]);

  useEffect(() => {
    const secTimer = setInterval(() => {
      setLastRefreshedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(secTimer);
  }, []);

  const fetchAnalytics = async (selectedRange: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Erreur chargement analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  // Géométrie SVG pour la courbe lissée des ventes et des visites au fil du temps
  const chartGeometry = useMemo(() => {
    if (!data || !data.timeSeries || data.timeSeries.length === 0) return null;
    const pts = data.timeSeries;
    const count = pts.length;
    const width = 800;
    const height = 240;
    const padding = { top: 20, right: 30, bottom: 35, left: 60 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const values = pts.map((p) => {
      if (metricMode === 'sales') return p.sales;
      if (metricMode === 'orders') return p.orders;
      return p.visitors;
    });
    const prevValues = pts.map((p) => {
      if (metricMode === 'sales') return p.prevSales;
      if (metricMode === 'orders') return p.prevOrders;
      return p.prevVisitors;
    });
    const maxVal = Math.max(...values, ...prevValues, metricMode === 'sales' ? 5000 : metricMode === 'visitors' ? 5 : 2);

    const yMax = Math.ceil(maxVal * 1.15);

    const getCoords = (vals: number[]) => {
      return vals.map((v, i) => {
        const x = padding.left + (i / Math.max(1, count - 1)) * plotWidth;
        const y = padding.top + plotHeight - (v / yMax) * plotHeight;
        return { x, y };
      });
    };

    const currentCoords = getCoords(values);
    const prevCoords = getCoords(prevValues);

    const createCurvedPath = (coords: Array<{ x: number; y: number }>) => {
      if (coords.length === 0) return '';
      if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

      let path = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i === 0 ? i : i - 1];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return path;
    };

    const currentLinePath = createCurvedPath(currentCoords);
    const prevLinePath = createCurvedPath(prevCoords);

    const baselineY = padding.top + plotHeight;
    const firstX = currentCoords[0]?.x || padding.left;
    const lastX = currentCoords[currentCoords.length - 1]?.x || width - padding.right;
    const areaPath = `${currentLinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const yVal = Math.round(ratio * yMax);
      const yPos = padding.top + plotHeight - ratio * plotHeight;
      return {
        val: yVal,
        y: yPos,
        label: metricMode === 'sales' ? (yVal >= 1000 ? `${Math.round(yVal / 1000)}k` : `${yVal}`) : `${yVal}`,
      };
    });

    return {
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
      yMax,
      currentCoords,
      prevCoords,
      currentLinePath,
      prevLinePath,
      areaPath,
      gridLines,
      baselineY,
    };
  }, [data, metricMode]);

  // Filtrage des visiteurs pour le journal d'audit IP & Géoloc (doit être avant tout return conditionnel)
  const filteredVisitors = useMemo(() => {
    const list =
      liveData?.recentVisitors && liveData.recentVisitors.length > 0
        ? liveData.recentVisitors
        : liveData?.activeVisitors || [];
    const q = visitorSearchQuery.trim().toLowerCase();

    return list.filter((v) => {
      // Filtre d'onglet
      if (visitorFilterTab === 'live' && v.lastSeenSec > 180) return false;
      if (visitorFilterTab === 'mobile' && v.device.toLowerCase() !== 'mobile') return false;
      if (visitorFilterTab === 'desktop' && v.device.toLowerCase() !== 'desktop') return false;

      // Filtre de recherche texte
      if (!q) return true;
      return (
        v.ipAddress.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        (v.region && v.region.toLowerCase().includes(q)) ||
        (v.country && v.country.toLowerCase().includes(q)) ||
        (v.isp && v.isp.toLowerCase().includes(q)) ||
        v.path.toLowerCase().includes(q) ||
        (v.title && v.title.toLowerCase().includes(q)) ||
        (v.browser && v.browser.toLowerCase().includes(q)) ||
        (v.device && v.device.toLowerCase().includes(q)) ||
        (v.createdAt && v.createdAt.toLowerCase().includes(q)) ||
        (v.lastHeartbeat && v.lastHeartbeat.toLowerCase().includes(q)) ||
        (v.utmSource && v.utmSource.toLowerCase().includes(q))
      );
    });
  }, [liveData, visitorSearchQuery, visitorFilterTab]);

  // Générateur de micro-sparkline pour chaque carte KPI
  const renderSparkline = (pts: number[], stroke = '#008060', fill = 'rgba(0, 128, 96, 0.12)') => {
    if (!pts || pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts, min + 1);
    const w = 110;
    const h = 32;

    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * w;
      const y = h - ((val - min) / (max - min)) * (h - 6) - 3;
      return `${x},${y}`;
    });

    const linePoints = coords.join(' ');
    const areaPoints = `0,${h} ${linePoints} ${w},${h}`;

    return (
      <svg width={w} height={h} className="overflow-visible">
        <polygon points={areaPoints} fill={fill} />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
      </svg>
    );
  };

  if (!data && loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
        <div className="inline-block animate-spin text-3xl mb-3 text-[#008060]">↻</div>
        <p className="text-sm font-bold text-slate-800">Chargement des données Shopify Analytics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalSales: 0,
    totalSalesChange: 0,
    prevSales: 0,
    totalOrders: 0,
    totalOrdersChange: 0,
    prevOrders: 0,
    aov: 0,
    aovChange: 0,
    prevAov: 0,
    returningCustomerRate: 0,
    uniqueCustomers: 0,
    returningCustomers: 0,
    totalVisitors: 0,
    totalVisitorsChange: 0,
    prevVisitors: 0,
    totalPageViews: 0,
    conversionRate: 0,
    conversionRateChange: 0,
    prevConversionRate: 0,
  };

  const salesSparkline = data?.timeSeries.map((t) => t.sales) || [0, 0];
  const ordersSparkline = data?.timeSeries.map((t) => t.orders) || [0, 0];
  const visitorsSparkline = data?.timeSeries.map((t) => t.visitors) || [0, 0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ======================================================== */}
      {/* 2. BARRE DE CONTRÔLE POLARIS (Plage temporelle & Comparaison) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Performances Commerciales & Ventes</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Chiffre d&apos;Affaires Réel
              </span>
            </h2>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Données réelles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Évolution du chiffre d&apos;affaires en direct, commandes physiques et volume de ventes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de date Shopify */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as 'today' | '7d' | '30d' | '90d' | 'ytd')}
              className="bg-transparent border-none text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer pr-2 py-1"
            >
              <option value="today">Aujourd&apos;hui</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
              <option value="ytd">Cette année (YTD)</option>
            </select>
          </div>

          {/* Comparaison période précédente */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#008060] focus:ring-[#008060]"
            />
            <span>vs période précédente</span>
          </label>

          {/* Actualiser */}
          <button
            onClick={() => fetchAnalytics(range)}
            disabled={loading}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#008060]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. GRAPHIQUE PRINCIPAL DES VENTES (MIS EN PREMIER)       */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>
                {metricMode === 'visitors' && 'Visites & Trafic au fil du temps'}
                {metricMode === 'sales' && 'Chiffre d\'affaires au fil du temps'}
                {metricMode === 'orders' && 'Volume de commandes au fil du temps'}
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {metricMode === 'visitors' && `${kpis.totalVisitors || 0} sessions`}
                {metricMode === 'sales' && formatFCFA(kpis.totalSales)}
                {metricMode === 'orders' && `${kpis.totalOrders} commandes`}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {metricMode === 'visitors' && 'Sessions uniques enregistrées sur la période sélectionnée.'}
              {metricMode === 'sales' && 'Chiffre d\'affaires brut encaissé sur la période sélectionnée.'}
              {metricMode === 'orders' && 'Nombre de commandes physiques passées sur la boutique.'}
            </p>
          </div>

          {/* Sélecteur de Métrique à 3 boutons */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 gap-1">
            <button
              onClick={() => setMetricMode('visitors')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'visitors'
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visites (Trafic)</span>
            </button>
            <button
              onClick={() => setMetricMode('sales')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'sales'
                  ? 'bg-white text-emerald-800 shadow-2xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Ventes (FCFA)</span>
            </button>
            <button
              onClick={() => setMetricMode('orders')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'orders'
                  ? 'bg-white text-blue-700 shadow-2xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Commandes</span>
            </button>
          </div>
        </div>

        {chartGeometry && (
          <div className="relative w-full overflow-hidden select-none">
            <svg
              viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
              className="w-full h-auto overflow-visible cursor-crosshair"
              onMouseLeave={() => setHoveredIndex(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * chartGeometry.width;
                const plotX = mouseX - chartGeometry.padding.left;
                if (plotX >= 0 && plotX <= chartGeometry.plotWidth && data?.timeSeries.length) {
                  const idx = Math.round((plotX / chartGeometry.plotWidth) * (data.timeSeries.length - 1));
                  setHoveredIndex(Math.max(0, Math.min(data.timeSeries.length - 1, idx)));
                }
              }}
            >
              <defs>
                <linearGradient id="shopifyVisitorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="shopifySalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#008060" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#008060" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="shopifyOrdersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Lignes horizontales de quadrillage */}
              {chartGeometry.gridLines.map((gl) => (
                <g key={gl.val}>
                  <line
                    x1={chartGeometry.padding.left}
                    y1={gl.y}
                    x2={chartGeometry.width - chartGeometry.padding.right}
                    y2={gl.y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={chartGeometry.padding.left - 10}
                    y={gl.y + 3}
                    textAnchor="end"
                    className="text-[10px] font-bold fill-slate-400 font-mono"
                  >
                    {gl.label}
                  </text>
                </g>
              ))}

              {/* Remplissage sous la courbe */}
              <path
                d={chartGeometry.areaPath}
                fill={
                  metricMode === 'visitors'
                    ? 'url(#shopifyVisitorsGradient)'
                    : metricMode === 'sales'
                    ? 'url(#shopifySalesGradient)'
                    : 'url(#shopifyOrdersGradient)'
                }
              />

              {/* Courbe période précédente en pointillés */}
              {showComparison && (
                <path
                  d={chartGeometry.prevLinePath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Courbe période courante */}
              <path
                d={chartGeometry.currentLinePath}
                fill="none"
                stroke={metricMode === 'visitors' ? '#6366f1' : metricMode === 'sales' ? '#008060' : '#2563eb'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Labels axe X */}
              {data?.timeSeries.map((pt, i) => {
                const coord = chartGeometry.currentCoords[i];
                if (!coord) return null;
                const skip = data.timeSeries.length > 12 && i % 2 !== 0 && i !== data.timeSeries.length - 1;
                return (
                  <g key={pt.date + i}>
                    {!skip && (
                      <text
                        x={coord.x}
                        y={chartGeometry.baselineY + 20}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-slate-500"
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Réticule au survol */}
              {hoveredIndex !== null && chartGeometry.currentCoords[hoveredIndex] && (
                <g>
                  <line
                    x1={chartGeometry.currentCoords[hoveredIndex].x}
                    y1={chartGeometry.padding.top}
                    x2={chartGeometry.currentCoords[hoveredIndex].x}
                    y2={chartGeometry.baselineY}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {showComparison && chartGeometry.prevCoords[hoveredIndex] && (
                    <circle
                      cx={chartGeometry.prevCoords[hoveredIndex].x}
                      cy={chartGeometry.prevCoords[hoveredIndex].y}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                    />
                  )}

                  <circle
                    cx={chartGeometry.currentCoords[hoveredIndex].x}
                    cy={chartGeometry.currentCoords[hoveredIndex].y}
                    r="5.5"
                    fill="#ffffff"
                    stroke={metricMode === 'visitors' ? '#6366f1' : metricMode === 'sales' ? '#008060' : '#2563eb'}
                    strokeWidth="3.5"
                  />
                </g>
              )}
            </svg>

            {/* Infobulle de détail Shopify */}
            {hoveredIndex !== null && data?.timeSeries[hoveredIndex] && (
              <div
                className="absolute z-30 pointer-events-none bg-slate-950 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[200px] transition-all transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(chartGeometry.currentCoords[hoveredIndex].x / chartGeometry.width) * 100}%`,
                  top: `${Math.max(10, chartGeometry.currentCoords[hoveredIndex].y - 12)}px`,
                }}
              >
                <div className="font-extrabold text-[11px] text-slate-300 border-b border-slate-800 pb-1.5 mb-1.5">
                  {data.timeSeries[hoveredIndex].label}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 font-bold text-slate-200">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            metricMode === 'visitors' ? '#6366f1' : metricMode === 'sales' ? '#008060' : '#2563eb',
                        }}
                      />
                      <span>Sélection :</span>
                    </span>
                    <span className="font-mono font-black text-white">
                      {metricMode === 'visitors'
                        ? `${data.timeSeries[hoveredIndex].visitors || 0} visiteur(s) • ${data.timeSeries[hoveredIndex].pageviews || 0} vue(s)`
                        : metricMode === 'sales'
                        ? formatFCFA(data.timeSeries[hoveredIndex].sales)
                        : `${data.timeSeries[hoveredIndex].orders} commande(s)`}
                    </span>
                  </div>

                  {showComparison && (
                    <div className="flex items-center justify-between gap-3 text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full border border-slate-400 bg-transparent" />
                        <span>Précédente :</span>
                      </span>
                      <span className="font-mono font-bold">
                        {metricMode === 'visitors'
                          ? `${data.timeSeries[hoveredIndex].prevVisitors || 0} visiteur(s)`
                          : metricMode === 'sales'
                          ? formatFCFA(data.timeSeries[hoveredIndex].prevSales)
                          : `${data.timeSeries[hoveredIndex].prevOrders} commande(s)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 mt-2 border-t border-slate-100 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-1 rounded-full ${
                metricMode === 'visitors' ? 'bg-[#6366f1]' : metricMode === 'sales' ? 'bg-[#008060]' : 'bg-[#2563eb]'
              }`}
            />
            <span>Période sélectionnée</span>
          </div>
          {showComparison && (
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-slate-400" />
              <span className="text-slate-500">Période précédente</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. CARTES KPI OFFICIELLES POLARIS (AVEC VISITES & CONVERSION) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* CARTE 1: VISITES DE LA BOUTIQUE EN LIGNE (TRAFIC) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Visites boutique</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {kpis.totalVisitors || 0} <span className="text-sm font-semibold text-slate-500">sessions</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {(kpis.prevVisitors || 0) > 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    (kpis.totalVisitorsChange || 0) >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {(kpis.totalVisitorsChange || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 text-rose-600" />
                  )}
                  {(kpis.totalVisitorsChange || 0) >= 0 ? `+${kpis.totalVisitorsChange}%` : `${kpis.totalVisitorsChange}%`}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">—</span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">vs précédente</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">Pages vues : {kpis.totalPageViews || 0}</span>
            {renderSparkline(visitorsSparkline, '#6366f1', 'rgba(99, 102, 241, 0.12)')}
          </div>
        </div>

        {/* CARTE 2: VENTES TOTALES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventes totales</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {formatFCFA(kpis.totalSales)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {kpis.prevSales > 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    kpis.totalSalesChange >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {kpis.totalSalesChange >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 text-rose-600" />
                  )}
                  {kpis.totalSalesChange >= 0 ? `+${kpis.totalSalesChange}%` : `${kpis.totalSalesChange}%`}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">—</span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">vs précédente</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">Tendance des ventes</span>
            {renderSparkline(salesSparkline, '#008060', 'rgba(0, 128, 96, 0.12)')}
          </div>
        </div>

        {/* CARTE 3: TOTAL DES COMMANDES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Commandes</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {kpis.totalOrders} <span className="text-sm font-semibold text-slate-500">commandes</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {kpis.prevOrders > 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    kpis.totalOrdersChange >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {kpis.totalOrdersChange >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 text-rose-600" />
                  )}
                  {kpis.totalOrdersChange >= 0 ? `+${kpis.totalOrdersChange}%` : `${kpis.totalOrdersChange}%`}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">—</span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">vs précédente</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">Volume commandes</span>
            {renderSparkline(ordersSparkline, '#2563eb', 'rgba(37, 99, 235, 0.12)')}
          </div>
        </div>

        {/* CARTE 4: TAUX DE CONVERSION DE LA BOUTIQUE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taux de conversion</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {kpis.conversionRate || 0}%
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {(kpis.prevConversionRate || 0) > 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    (kpis.conversionRateChange || 0) >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {(kpis.conversionRateChange || 0) >= 0 ? `+${kpis.conversionRateChange}%` : `${kpis.conversionRateChange}%`}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">—</span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">vs précédente</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">Commandes / Visiteurs</span>
            <span className="text-xs font-extrabold text-emerald-700">{kpis.totalOrders} / {kpis.totalVisitors || 0}</span>
          </div>
        </div>

        {/* CARTE 5: PANIER MOYEN (AOV) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Panier moyen (AOV)</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {formatFCFA(kpis.aov)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {kpis.prevAov > 0 ? (
                <span
                  className={`inline-flex items-center text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                    kpis.aovChange >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {kpis.aovChange >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 text-rose-600" />
                  )}
                  {kpis.aovChange >= 0 ? `+${kpis.aovChange}%` : `${kpis.aovChange}%`}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">—</span>
              )}
              <span className="text-[11px] text-slate-400 font-medium">vs précédente</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">Panier moyen / client</span>
            {renderSparkline([kpis.prevAov || kpis.aov, kpis.aov], '#f59e0b', 'rgba(245, 158, 11, 0.12)')}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SECTIONS AUTHENTIQUES SHOPIFY (RAPPORTS DÉTAILLÉS) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARTE : MEILLEURS PRODUITS PAR UNITÉS VENDUES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Meilleurs produits par unités vendues
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Produits les plus populaires calculés depuis les commandes passées.
              </p>
            </div>
          </div>

          {data?.topProducts && data.topProducts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.topProducts.map((p, idx) => (
                <div key={p.name + idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=120'}
                      alt={p.name}
                      className="w-11 h-11 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {p.units} unité{p.units > 1 ? 's' : ''} vendue{p.units > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">{formatFCFA(p.revenue)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{p.share}% des ventes</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune vente de produit enregistrée sur cette période.
            </div>
          )}
        </div>

        {/* CARTE : VENTES PAR CANAL ET SOURCE MARKETING */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Ventes attribuées au marketing & canaux
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Origine des commandes d&apos;après le canal ou tag de campagne.
              </p>
            </div>
          </div>

          {data?.channels && data.channels.length > 0 ? (
            <div className="space-y-3.5 pt-1">
              {data.channels.map((chan) => (
                <div key={chan.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chan.color }} />
                      <span>{chan.label}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">{formatFCFA(chan.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(5, chan.share))}%`,
                          backgroundColor: chan.color,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 w-12 text-right">
                      {chan.orders} cmd ({chan.share}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune source marketing enregistrée sur cette période.
            </div>
          )}
        </div>

        {/* CARTE : VENTES PAR DESTINATION DE LIVRAISON */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Ventes par destination de livraison
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Villes et communes où les commandes ont été passées.
              </p>
            </div>
          </div>

          {data?.geography && data.geography.length > 0 ? (
            <div className="space-y-3 pt-1">
              {data.geography.map((geo) => (
                <div key={geo.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{geo.name}</span>
                    </span>
                    <span className="font-mono text-slate-900">{formatFCFA(geo.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, geo.share))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 w-12 text-right">
                      {geo.count} cmd ({geo.share}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Aucune commande livrable sur cette période.
            </div>
          )}
        </div>

        {/* CARTE : ÉTAT DE TRAITEMENT DES COMMANDES (FULFILLMENT STATUS) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                État de traitement des commandes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Répartition des commandes selon leur statut logistique.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            {/* Non traitées */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-black text-amber-950">Non traitées</span>
                  <p className="text-[10px] text-amber-700">Nouvelles & En préparation</p>
                </div>
              </div>
              <span className="text-sm font-black text-amber-900 font-mono">
                {data?.fulfillmentStatus.unfulfilled || 0}
              </span>
            </div>

            {/* Traitées */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-black text-emerald-950">Traitées</span>
                  <p className="text-[10px] text-emerald-700">Expédiées & Livrées</p>
                </div>
              </div>
              <span className="text-sm font-black text-emerald-900 font-mono">
                {data?.fulfillmentStatus.fulfilled || 0}
              </span>
            </div>

            {/* Annulées */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-black text-slate-800">Annulées</span>
                  <p className="text-[10px] text-slate-500">Commandes annulées</p>
                </div>
              </div>
              <span className="text-sm font-black text-slate-700 font-mono">
                {data?.fulfillmentStatus.cancelled || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      
      {/* ======================================================== */}
      {/* CENTRE D'AUDIT IP & TRAFIC EN DIRECT (THÈME SOMBRE)      */}
      {/* ======================================================== */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 text-emerald-400 border border-slate-800 flex items-center justify-center shadow-lg shadow-slate-950/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Centre de Surveillance IP & Renseignement Trafic</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Audit haute précision des adresses IP réelles, FAI (MTN, Moov, Celtiis), géolocalisation et acheteurs en direct.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-slate-900 text-emerald-400 px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Thème Sombre Haute Précision</span>
          </span>
        </div>
      </div>
{/* 1. MODULE SHOPIFY LIVE VIEW — VISITEURS EN TEMPS RÉEL    */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow Effects de fond */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* En-tête Live View */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 block animate-ping"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 block absolute inset-0 shadow-lg shadow-emerald-500/50"></span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Vue en Direct • Live View
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider animate-pulse">
                  Temps Réel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance instantanée des acheteurs naviguant actuellement sur votre boutique.
              </p>
            </div>
          </div>

          {/* Contrôles du direct */}
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-slate-400 font-medium">
              Actualisé il y a <span className="text-white font-bold tabular-nums">{lastRefreshedSec}s</span>
            </div>
            <button
              onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                liveAutoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${liveAutoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
              <span>{liveAutoRefresh ? 'Direct Actif' : 'En Pause'}</span>
            </button>

            <button
              onClick={fetchLiveVisitors}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
              title="Rafraîchir maintenant"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bento Grid Live View */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-6 relative z-10">
          
          {/* Colonne 1 : Compteur Géant & Activité 30 min (5 cols) */}
          <div className="md:col-span-5 bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Visiteurs en ligne en ce moment</span>
              </span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                  {liveData?.activeCount || 0}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  actifs (&lt; 3 min)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Aujourd&apos;hui : <strong className="text-white">{liveData?.todayVisitorsCount || 0}</strong> visiteurs uniques ({liveData?.todayPageViewsCount || 0} pages vues)
              </p>
            </div>

            {/* Mini-Graphique bâtonnets des 30 dernières minutes */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                <span>Activité récente (30 dernières minutes)</span>
                <span className="text-emerald-400 font-semibold">Par tranche de 2 min</span>
              </div>
              
              <div className="h-16 flex items-end gap-1 sm:gap-1.5 pt-2">
                {liveData?.last30Minutes.map((m, idx) => {
                  const max = Math.max(...(liveData?.last30Minutes.map((x) => x.visitors) || [1]), 3);
                  const heightPct = Math.max(12, Math.round((m.visitors / max) * 100));
                  const isLatest = idx === (liveData?.last30Minutes.length - 1);
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                    >
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                        {m.minuteLabel} : {m.visitors} visiteur(s)
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          isLatest
                            ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                            : m.visitors > 0
                            ? 'bg-indigo-400/80 group-hover:bg-indigo-300'
                            : 'bg-white/10'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                <span>Il y a 30m</span>
                <span>Il y a 15m</span>
                <span className="text-emerald-400 font-bold">Maintenant</span>
              </div>
            </div>
          </div>

          {/* Colonne 2 : Pages consultées en direct (4 cols) */}
          <div className="md:col-span-4 bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Pages consultées en direct</span>
              </span>

              {liveData?.activePages && liveData.activePages.length > 0 ? (
                <div className="space-y-3">
                  {liveData.activePages.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium truncate max-w-[190px]" title={p.path}>
                          {p.label}
                        </span>
                        <span className="text-emerald-400 font-bold tabular-nums text-xs shrink-0">
                          {p.count} ({p.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${p.percentage}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  En attente de nouvelles visites...
                </div>
              )}
            </div>

            {/* Répartition terminaux */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile : <strong className="text-white">{liveData?.deviceBreakdown.mobile || 0}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span>Ordinateur : <strong className="text-white">{liveData?.deviceBreakdown.desktop || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Colonne 3 : Visiteurs, Adresses IP & Géolocalisation Réelle (3 cols) */}
          <div className="md:col-span-3 bg-white/5 rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Localisation & Adresses IP</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  GPS & GeoIP
                </span>
              </div>

              {liveData?.activeVisitors && liveData.activeVisitors.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {liveData.activeVisitors.slice(0, 4).map((v, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs space-y-1.5 transition"
                    >
                      <div className="flex items-center justify-between">
                        {/* Ville & Région */}
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="truncate max-w-[130px]">{v.city}{v.region ? `, ${v.region}` : ''}</span>
                        </span>

                        {/* Adresse IP avec bouton de copie */}
                        <button
                          onClick={() => handleCopyIp(v.ipAddress)}
                          className="font-mono text-[10px] text-slate-300 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1 transition cursor-pointer"
                          title="Cliquez pour copier l'adresse IP"
                        >
                          <span>{v.ipAddress}</span>
                          {copiedIp === v.ipAddress ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* FAI & Terminal */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-amber-300/90 flex items-center gap-1">
                          <Wifi className="w-2.5 h-2.5 text-amber-400" />
                          <span className="truncate max-w-[120px]">{v.isp || 'Opérateur Réseau'}</span>
                        </span>
                        <span className="text-slate-300">
                          {v.browser || v.device}
                        </span>
                      </div>

                      {/* Page consultée & Lien Google Maps */}
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                        <span className="text-slate-300 truncate max-w-[140px]">
                          {v.path === '/' ? 'Vitrine Accueil' : v.path.replace('/produit/', 'Produit: ')}
                        </span>
                        {v.latitude && v.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-bold"
                            title="Ouvrir l'emplacement sur Google Maps"
                          >
                            <span>Carte</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-emerald-300 font-bold">{v.lastSeenSec}s</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Aucun visiteur actif en ce moment.
                </div>
              )}
            </div>

            <div className="pt-3 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>Bénin & International</span>
              </div>
              <a href="#journal-visiteurs" className="text-blue-400 hover:underline font-bold text-[10px]">
                Voir tout l&apos;historique IP ↓
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. JOURNAL COMPLET DES VISITEURS, ADRESSES IP & GÉOLOCALISATION */}
      {/* ======================================================== */}
      <div id="journal-visiteurs" className="bg-slate-950 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden">
        {/* Glow Effects de fond */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shadow-xs">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Journal des Visiteurs & Audit IP</span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    {filteredVisitors.length} session(s)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traçabilité complète des adresses IP réelles, des localisations géographiques et des opérateurs télécoms (MTN, Moov, Celtiis).
                </p>
              </div>
            </div>
          </div>

          {/* Actions : Exporter CSV & Purger les fausses connexions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanFakeVisitors}
              disabled={isCleaningVisitors}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
              title="Supprimer définitivement les robots, crawlers (Amazon AWS, Headless) et tests locaux"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isCleaningVisitors ? 'Nettoyage...' : 'Purger robots & tests'}</span>
            </button>
            <button
              onClick={() => exportVisitorsCsv(filteredVisitors)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              title="Télécharger l'historique complet en fichier CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Barre de Recherche et Filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          {/* Recherche */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={visitorSearchQuery}
              onChange={(e) => setVisitorSearchQuery(e.target.value)}
              placeholder="Rechercher par IP, Ville, Opérateur, Page..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            {visitorSearchQuery && (
              <button
                onClick={() => setVisitorSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Onglets Filtres */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-bold text-slate-400">
            <button
              onClick={() => setVisitorFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                visitorFilterTab === 'all' ? 'bg-slate-800 text-white shadow-xs font-extrabold border border-slate-700' : 'hover:text-slate-200'
              }`}
            >
              Tous ({liveData?.recentVisitors?.length || liveData?.activeVisitors?.length || 0})
            </button>
            <button
              onClick={() => setVisitorFilterTab('live')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                visitorFilterTab === 'live' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs font-extrabold' : 'hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>En Direct ({liveData?.activeCount || 0})</span>
            </button>
            <button
              onClick={() => setVisitorFilterTab('mobile')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                visitorFilterTab === 'mobile' ? 'bg-slate-800 text-white shadow-xs font-extrabold border border-slate-700' : 'hover:text-slate-200'
              }`}
            >
              Mobiles
            </button>
            <button
              onClick={() => setVisitorFilterTab('desktop')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                visitorFilterTab === 'desktop' ? 'bg-slate-800 text-white shadow-xs font-extrabold border border-slate-700' : 'hover:text-slate-200'
              }`}
            >
              Ordinateurs
            </button>
          </div>
        </div>

        {/* Tableau des Visiteurs */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-inner relative z-10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                <th className="py-3 px-3.5">Statut / Récence</th>
                <th className="py-3 px-3.5">Adresse IP</th>
                <th className="py-3 px-3.5">Localisation Réelle</th>
                <th className="py-3 px-3.5">Opérateur / FAI</th>
                <th className="py-3 px-3.5">Terminal & App</th>
                <th className="py-3 px-3.5">Page Consultée</th>
                <th className="py-3 px-3.5">Source</th>
                <th className="py-3 px-3.5 text-right">Durée</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVisitors.length > 0 ? (
                filteredVisitors.map((v, i) => {
                  const isLive = v.lastSeenSec <= 180;
                  return (
                    <tr key={v.sessionId + i} className="hover:bg-slate-800/50 transition group">
                      {/* Statut / Récence & Horodatage précis */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isLive ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-700/60 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span>En direct</span>
                            </span>
                            <div className="text-[10px] text-emerald-400/80 font-mono pl-1">
                              Actif maintenant
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-[11px] text-slate-300 font-bold">
                              {v.lastSeenSec < 60
                                ? `Il y a ${v.lastSeenSec}s`
                                : v.lastSeenSec < 3600
                                  ? `Il y a ${Math.round(v.lastSeenSec / 60)} min`
                                  : v.lastSeenSec < 86400
                                    ? `Il y a ${Math.round(v.lastSeenSec / 3600)} h`
                                    : `Il y a ${Math.round(v.lastSeenSec / 86400)} j`}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {v.lastHeartbeat || v.createdAt
                                ? new Date(v.lastHeartbeat || v.createdAt).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Adresse IP */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-400 bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-[11px] shadow-xs">
                            {v.ipAddress}
                          </span>
                          <button
                            onClick={() => handleCopyIp(v.ipAddress)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Copier l'adresse IP"
                          >
                            {copiedIp === v.ipAddress ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Localisation Réelle */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <div>
                            <div className="font-bold text-white">
                              {v.city}{v.region ? `, ${v.region}` : ''}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {v.country}
                            </div>
                          </div>
                          {v.latitude && v.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 text-cyan-400 hover:text-cyan-300 p-1 rounded hover:bg-cyan-950/40 transition"
                              title="Voir l'emplacement sur Google Maps"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Opérateur / FAI */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-900 text-amber-300 border border-amber-500/20">
                          <Wifi className="w-3 h-3 text-amber-400" />
                          <span>{v.isp || 'Opérateur Réseau'}</span>
                        </span>
                      </td>

                      {/* Terminal & App */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {v.device.toLowerCase() === 'desktop' ? (
                            <Monitor className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span className="font-semibold text-slate-200">
                            {v.browser || (v.device === 'desktop' ? 'Ordinateur' : 'Mobile')}
                          </span>
                        </div>
                      </td>

                      {/* Page consultée */}
                      <td className="py-3 px-3.5 max-w-[200px]">
                        <div className="truncate font-semibold text-white" title={v.title || v.path}>
                          {v.path === '/' ? 'Vitrine Accueil' : v.path.replace('/produit/', 'Produit : ')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {v.path}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {v.utmSource || 'Direct'}
                        </span>
                      </td>

                      {/* Durée */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-300">
                        {v.durationSec < 60 ? `${v.durationSec}s` : `${Math.floor(v.durationSec / 60)}m ${v.durationSec % 60}s`}
                      </td>

                      {/* Action : Supprimer la session */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDeleteVisitorSession(v.sessionId)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          title="Supprimer cette connexion du journal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Aucun visiteur ne correspond à vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
