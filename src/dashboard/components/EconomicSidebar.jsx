import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  BarChart3,
  ShoppingCart,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { authFetch } from '../../lib/supabase';

const API_BASE = '';

// Mini sparkline SVG component
const Sparkline = ({ data, color, height = 32, width = 100 }) => {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => (typeof d === 'object' ? d.value : d)).filter((v) => v != null);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on latest value */}
      {values.length > 0 && (
        <circle
          cx={width}
          cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
};

// Indicator Card Component
const IndicatorCard = ({ data, icon: Icon, accentColor, isExpanded, onToggle }) => {
  if (!data) return null;

  const isUp = data.trend === 'up';
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const ArrowIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const trendColor = isUp ? '#22c55e' : '#ef4444';

  // Format the change value
  let changeDisplay = '';
  if (data.indicator === 'NFP') {
    changeDisplay = data.monthly_change
      ? `${data.monthly_change > 0 ? '+' : ''}${(data.monthly_change / 1000).toFixed(0)}K jobs`
      : 'N/A';
  } else if (data.indicator === 'GDP') {
    changeDisplay = data.quarterly_growth != null ? `${data.quarterly_growth > 0 ? '+' : ''}${data.quarterly_growth}% QoQ` : 'N/A';
  } else if (data.indicator === 'RETAIL') {
    const rs = data.retail_sales;
    changeDisplay = rs?.mom_change != null ? `${rs.mom_change > 0 ? '+' : ''}${rs.mom_change}% MoM` : 'N/A';
  } else {
    changeDisplay = data.yoy_change != null ? `${data.yoy_change > 0 ? '+' : ''}${data.yoy_change}% YoY` : 'N/A';
  }

  // Get the series for sparkline
  let series = data.series || (data.retail_sales && data.retail_sales.series) || [];

  // Format latest value
  let latestFormatted = '';
  if (data.indicator === 'RETAIL') {
    const val = data.retail_sales?.latest_value;
    latestFormatted = val ? `$${(val / 1000).toFixed(1)}B` : 'N/A';
  } else if (data.indicator === 'NFP') {
    latestFormatted = data.latest_value ? `${(data.latest_value / 1000).toFixed(0)}K` : 'N/A';
  } else if (data.indicator === 'GDP') {
    latestFormatted = data.latest_value ? `$${(data.latest_value / 1000).toFixed(1)}T` : 'N/A';
  } else {
    latestFormatted = data.latest_value ? data.latest_value.toFixed(1) : 'N/A';
  }

  return (
    <div className="group relative">
      {/* Main Card */}
      <div
        onClick={onToggle}
        className="relative cursor-pointer rounded-xl border transition-all duration-300 overflow-hidden"
        style={{
          background: isExpanded
            ? `linear-gradient(135deg, ${accentColor}08, ${accentColor}03, transparent)`
            : 'rgba(15, 15, 20, 0.6)',
          borderColor: isExpanded ? `${accentColor}30` : 'rgba(39, 39, 42, 0.5)',
        }}
      >
        {/* Glow effect on expanded */}
        {isExpanded && (
          <div
            className="absolute inset-0 opacity-20 blur-2xl pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top, ${accentColor}20, transparent 70%)` }}
          />
        )}

        <div className="relative p-3">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}20` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-300 block leading-tight">
                  {data.indicator}
                </span>
                <span className="text-[8px] text-zinc-600 font-medium">{data.full_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {data.live ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[7px] font-bold text-emerald-400 uppercase">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[7px] font-bold text-amber-400 uppercase">Sim</span>
                </div>
              )}
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              )}
            </div>
          </div>

          {/* Value Row */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-lg font-black text-white leading-none tracking-tight">{latestFormatted}</div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowIcon className="w-3 h-3" style={{ color: trendColor }} />
                <span className="text-[10px] font-bold" style={{ color: trendColor }}>
                  {changeDisplay}
                </span>
              </div>
            </div>
            <Sparkline data={series} color={accentColor} height={28} width={80} />
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-zinc-800/50 mt-1 pt-2 space-y-2">
            {/* Description */}
            <p className="text-[9px] text-zinc-500 leading-relaxed">{data.description}</p>

            {/* Impact */}
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[8px] text-zinc-400 leading-relaxed">{data.impact}</p>
            </div>

            {/* Additional Metrics */}
            {data.indicator === 'CPI' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
                  <span className="text-[7px] text-zinc-600 font-bold uppercase block">MoM Change</span>
                  <span className="text-xs font-bold text-zinc-300">
                    {data.mom_change != null ? `${data.mom_change > 0 ? '+' : ''}${data.mom_change}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
                  <span className="text-[7px] text-zinc-600 font-bold uppercase block">YoY Change</span>
                  <span className="text-xs font-bold text-zinc-300">
                    {data.yoy_change != null ? `${data.yoy_change > 0 ? '+' : ''}${data.yoy_change}%` : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {data.indicator === 'RETAIL' && data.consumer_confidence && (
              <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/30">
                <span className="text-[7px] text-zinc-600 font-bold uppercase block">Consumer Confidence (UMich)</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-zinc-300">
                    {data.consumer_confidence.latest_value?.toFixed(1) || 'N/A'}
                  </span>
                  {data.consumer_confidence.change != null && (
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: data.consumer_confidence.trend === 'up' ? '#22c55e' : '#ef4444' }}
                    >
                      {data.consumer_confidence.change > 0 ? '+' : ''}
                      {data.consumer_confidence.change.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="flex items-center justify-between">
              <span className="text-[7px] text-zinc-600 font-medium">
                Last: {data.latest_date || data.retail_sales?.latest_date || 'N/A'}
              </span>
              <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: `${accentColor}80` }}>
                {data.source?.replace('FRED (Federal Reserve Economic Data)', 'FRED').replace('Simulated (Set FRED_API_KEY for live data)', 'Simulated')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EconomicSidebar = () => {
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCard, setExpandedCard] = useState('CPI');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const resp = await authFetch(`${API_BASE}/api/economic/summary`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setIndicators(data.indicators);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('Economic data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    refreshIntervalRef.current = setInterval(() => fetchData(true), 300000);
    return () => clearInterval(refreshIntervalRef.current);
  }, []);

  const indicatorConfig = [
    { key: 'CPI', icon: DollarSign, color: '#f59e0b' },
    { key: 'PPI', icon: BarChart3, color: '#8b5cf6' },
    { key: 'NFP', icon: Users, color: '#3b82f6' },
    { key: 'GDP', icon: Globe, color: '#22c55e' },
    { key: 'RETAIL', icon: ShoppingCart, color: '#ec4899' },
  ];

  const getIndicatorData = (key) => {
    if (!indicators) return null;
    const items = Array.isArray(indicators) ? indicators : Object.values(indicators);
    return items.find((ind) => ind.indicator === key);
  };

  return (
    <aside className="w-72 h-full border-r border-zinc-800/50 bg-[#08080c] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Economic</h2>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Macro Indicators</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}
            />
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
              {error ? 'Connection Error' : 'Data Stream Active'}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-[7px] text-zinc-600 font-medium">{lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Indicator Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              Loading Economic Data...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-[9px] font-bold text-zinc-400 text-center">
              Failed to connect to backend
            </span>
            <span className="text-[8px] text-zinc-600 text-center">{error}</span>
            <button
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          indicatorConfig.map((config) => (
            <IndicatorCard
              key={config.key}
              data={getIndicatorData(config.key)}
              icon={config.icon}
              accentColor={config.color}
              isExpanded={expandedCard === config.key}
              onToggle={() => setExpandedCard(expandedCard === config.key ? null : config.key)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800/50">
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-400">
              Trading Impact
            </span>
          </div>
          <p className="text-[8px] text-zinc-500 leading-relaxed">
            Economic releases create high volatility windows. Data auto-refreshes every 5 minutes from FRED.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default EconomicSidebar;
