import React, { useEffect, useState } from 'react';
import { RefreshCw, Radio, Target, TrendingUp, TrendingDown, Minus, Activity, Cpu, Globe, Clock, Landmark, AlertTriangle } from 'lucide-react';
import { authFetch, createAuthenticatedWebSocket } from '../../lib/supabase';

const API_BASE = '';

const MARKET_SESSIONS = [
  { name: "Sydney", start_utc: 22, end_utc: 7, liquidity: "Lowest liquidity. Often range-bound.", focus: "AUD, NZD" },
  { name: "Tokyo (Asia)", start_utc: 0, end_utc: 9, liquidity: "Moderate liquidity.", focus: "JPY pairs" },
  { name: "London (Europe)", start_utc: 8, end_utc: 17, liquidity: "Highest activity.", focus: "EUR, GBP, CHF" },
  { name: "New York (US)", start_utc: 13, end_utc: 22, liquidity: "US economic data drives volatility.", focus: "USD pairs" }
];

const MarketSessionsWidget = () => {
  const [currentHour, setCurrentHour] = useState(new Date().getUTCHours());

  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getUTCHours()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isSessionActive = (start, end) => {
    if (start > end) return currentHour >= start || currentHour < end;
    return currentHour >= start && currentHour < end;
  };

  return (
    <div className="mb-6 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 relative overflow-hidden">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" /> Global Market Sessions (UTC)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {MARKET_SESSIONS.map((session, idx) => {
          const active = isSessionActive(session.start_utc, session.end_utc);
          return (
            <div key={idx} className={`relative overflow-hidden rounded-xl p-4 border transition-all duration-500 ${active ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-zinc-900/20 border-zinc-800/50 opacity-60 grayscale'}`}>
              {active && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full" />}
              <div className="flex justify-between items-start mb-2">
                <h4 className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-zinc-400'}`}>{session.name}</h4>
                {active ? (
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                    Closed
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mb-3">
                {String(session.start_utc).padStart(2, '0')}:00 - {String(session.end_utc).padStart(2, '0')}:00 UTC
              </div>
              <div className="text-xs text-zinc-400 font-sans leading-relaxed">
                {session.liquidity}
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800/50 text-[10px] font-black text-zinc-500 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> {session.focus}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CentralBankPolicyWidget = ({ policy }) => {
  if (!policy || Object.keys(policy).length === 0) return null;

  return (
    <div className="mb-6 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5 text-indigo-400" /> Central Bank Speech & Policy NLP Sentiment Parser
          </h3>
          <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
            Interest Rate Decisions (Delta bps) & Qualitative Speech Sentiment (-1.00 Dovish to +1.00 Hawkish)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Object.entries(policy).map(([key, bank]) => {
          const score = bank.sentiment_score ?? 0;
          const posPercent = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
          const isHawkish = score > 0.15;
          const isDovish = score < -0.15;
          const badgeColor = isHawkish
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : isDovish
            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

          const deltaBps = bank.delta_bps ?? 0;
          const deltaColor = deltaBps > 0
            ? 'text-emerald-400 bg-emerald-500/10'
            : deltaBps < 0
            ? 'text-blue-400 bg-blue-500/10'
            : 'text-zinc-400 bg-zinc-800/50';

          return (
            <div key={key} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-white">{bank.bank}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                    {key}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-mono font-black text-white">{bank.rate}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${deltaColor}`}>
                    {deltaBps > 0 ? `+${deltaBps} bps` : `${deltaBps} bps`}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold text-zinc-400 font-sans">{bank.sentiment_label}</span>
                    <span className="font-mono font-black text-zinc-200">
                      {score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-zinc-800 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-60 rounded-full" />
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_white] -ml-1 transition-all duration-500"
                      style={{ left: `${posPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1">
                    <span>-1.0 Dovish</span>
                    <span>0.0</span>
                    <span>+1.0 Hawkish</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-900 mb-3">
                  <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-black block mb-1">
                    Forward Guidance Scanner
                  </span>
                  <p className="text-[10px] text-zinc-300 font-sans leading-relaxed line-clamp-3">
                    "{bank.guidance}"
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                <span>{bank.speaker}</span>
                <span>{bank.last_update}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GlobalBiasIndexWidget = ({ data }) => {
  if (!data) return null;

  // Determine color based on score
  let color = 'text-amber-400';
  let bg = 'bg-amber-500/10';
  let border = 'border-amber-500/20';
  let gradient = 'from-amber-500 to-amber-900';

  if (data.score >= 60) {
    color = 'text-emerald-400';
    bg = 'bg-emerald-500/10';
    border = 'border-emerald-500/20';
    gradient = 'from-emerald-500 to-emerald-900';
  } else if (data.score <= 40) {
    color = 'text-red-400';
    bg = 'bg-red-500/10';
    border = 'border-red-500/20';
    gradient = 'from-red-500 to-red-900';
  }

  return (
    <div className="mb-6 bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
      {/* Background Glow */}
      <div className={`absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br ${gradient} opacity-10 blur-3xl rounded-full`} />

      <div className="flex-shrink-0 flex items-center justify-center relative w-24 h-24">
        {/* Background Ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" className="stroke-zinc-800" strokeWidth="8" />
          {/* Progress Ring */}
          <circle
            cx="50" cy="50" r="45" fill="none"
            className={`stroke-current ${color}`}
            strokeWidth="8"
            strokeDasharray={`${(data.score / 100) * 283} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-2xl font-black ${color}`}>{data.score}</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" /> Global Macro Sentiment Index
        </h3>
        <h2 className={`text-xl font-black uppercase tracking-widest mb-2 ${color}`}>
          {data.label}
        </h2>
        <div className={`p-3 rounded-lg border ${bg} ${border}`}>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed flex items-start gap-2">
            <Cpu className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
            {data.summary}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function MacroIntelSpace() {
  const [biases, setBiases] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [policy, setPolicy] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [showCachedNotice, setShowCachedNotice] = useState(false);
  const [globalIndex, setGlobalIndex] = useState(null);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const applyFallbackData = () => {
    setBiases([
      {
        date: new Date().toISOString().split('T')[0],
        asset_class: 'USD',
        bias: 'Bullish',
        confidence_score: 85,
        key_drivers: ['Core CPI beat estimates', 'Hawkish Fed statements']
      },
      {
        date: new Date().toISOString().split('T')[0],
        asset_class: 'S&P 500',
        bias: 'Bearish',
        confidence_score: 72,
        key_drivers: ['Rising bond yields', 'Tech sector rotation']
      },
      {
        date: new Date().toISOString().split('T')[0],
        asset_class: 'Gold',
        bias: 'Neutral',
        confidence_score: 55,
        key_drivers: ['Safe-haven demand vs Strong Dollar balance']
      },
      {
        date: new Date().toISOString().split('T')[0],
        asset_class: 'EUR/USD',
        bias: 'Bearish',
        confidence_score: 90,
        key_drivers: ['ECB rate cut signaling', 'Weak Eurozone PMI']
      },
      {
        date: new Date().toISOString().split('T')[0],
        asset_class: 'BTC/USD',
        bias: 'Bullish',
        confidence_score: 88,
        key_drivers: ['Favorable ETF inflows', 'Halving supply shock pricing']
      }
    ]);
    setGlobalIndex({
      date: new Date().toISOString().split('T')[0],
      score: 55,
      label: "Neutral",
      summary: "Market participants remain cautious awaiting further economic data and central bank guidance."
    });
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      let biasRes = null;
      try {
        biasRes = await authFetch('/api/macro/bias', { signal: AbortSignal.timeout(6000) });
      } catch (err) {
        biasRes = null;
      }

      if (biasRes && biasRes.ok) {
        setBackendOffline(false);
        const data = await biasRes.json();
        const sortedData = (data.biases || []).sort((a, b) => a.asset_class.localeCompare(b.asset_class));
        setBiases(sortedData);
        if (data.next_sync_in_seconds !== undefined) {
          setCountdown(data.next_sync_in_seconds);
        }

        const [feedsRes, globalIndexRes, policyRes] = await Promise.all([
          authFetch('/api/macro/feeds', { signal: AbortSignal.timeout(6000) }).catch(() => null),
          authFetch('/api/macro/global_index', { signal: AbortSignal.timeout(6000) }).catch(() => null),
          authFetch('/api/macro/policy', { signal: AbortSignal.timeout(6000) }).catch(() => null)
        ]);

        if (feedsRes && feedsRes.ok) {
          const feedData = await feedsRes.json();
          setFeeds(feedData.feeds || []);
        }

        if (globalIndexRes && globalIndexRes.ok) {
          const indexData = await globalIndexRes.json();
          setGlobalIndex(indexData.global_index);
        }

        if (policyRes && policyRes.ok) {
          const policyData = await policyRes.json();
          setPolicy(policyData.policy || {});
        }
      } else {
        setBackendOffline(true);
        console.warn('Macro Intel backend gateway unreachable (503/offline). Using demonstrative market models.');
        applyFallbackData();
      }
    } catch (err) {
      setBackendOffline(true);
      console.warn('Notice: Backend offline or slow to respond. Loaded demonstrative models.', err);
      applyFallbackData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    let socket;
    let reconnectTimer;
    let reconnectDelay = 3000;

    const connectWS = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = createAuthenticatedWebSocket(`${wsProtocol}//${window.location.host}/ws/bias`);

      socket.onopen = () => {
        setSocketConnected(true);
        setBackendOffline(false);
        reconnectDelay = 3000;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'bias_update') {
            // Reset the countdown timer
            setCountdown(60);

            if (msg.is_cached) {
              setShowCachedNotice(true);
              setTimeout(() => setShowCachedNotice(false), 3500);
            }

            // Update the specific asset class bias or add new and keep strictly sorted
            setBiases(prev => {
              const exists = prev.find(b => b.asset_class.toLowerCase() === msg.data.asset_class.toLowerCase());
              let newBiases;
              if (exists) {
                newBiases = prev.map(b => b.asset_class.toLowerCase() === msg.data.asset_class.toLowerCase() ? msg.data : b);
              } else {
                newBiases = [msg.data, ...prev];
              }
              return newBiases.sort((a, b) => a.asset_class.localeCompare(b.asset_class));
            });
          } else if (msg.type === 'global_index_update') {
            setGlobalIndex(msg.data);
          } else if (msg.type === 'central_bank_update') {
            setPolicy(prev => ({ ...prev, [msg.bank]: msg.data }));
          }
        } catch (err) {
          console.error('WS Error:', err);
        }
      };

      socket.onclose = () => {
        setSocketConnected(false);
        // Exponential backoff to avoid flooding browser logs when offline
        reconnectTimer = setTimeout(connectWS, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 20000);
      };
    };

    connectWS();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null; // Prevent reconnect loop
        if (socket.readyState === 1) { // OPEN
          socket.close();
        }
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Initializing AI Bias Engine...</p>
        </div>
      </div>
    );
  }

  const getBiasStyles = (bias) => {
    switch (bias) {
      case 'Bullish':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <TrendingUp className="w-4 h-4" /> };
      case 'Bearish':
        return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <TrendingDown className="w-4 h-4" /> };
      case 'Neutral':
      default:
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <Minus className="w-4 h-4" /> };
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full bg-[#080808]">
      <div className="absolute inset-0 overflow-y-auto p-6 text-[#e0e0e0] font-sans">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-blue-500" />
              Automated Macro Bias Engine
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
              Local LLM Quantitative Reasoning & Data Validation Pipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-2 relative">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {countdown === 0 ? 'Engine Status' : 'Next Sync'}
              </span>
              <span className={`text-sm font-mono font-black ${countdown === 0 ? 'text-amber-400 animate-pulse' : countdown < 5 ? 'text-red-400 animate-pulse' : 'text-zinc-300'}`}>
                {countdown === 0 ? 'SYNCING...' : formatTime(countdown)}
              </span>
              {showCachedNotice && (
                <div className="absolute top-full mt-1 right-0 whitespace-nowrap bg-blue-900/40 border border-blue-500/50 text-blue-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded animate-pulse">
                  Market Stable - No New Updates
                </div>
              )}
            </div>
            <button onClick={fetchInitialData} className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900/80 border border-zinc-800 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400">
              <Radio className={`w-3.5 h-3.5 ${socketConnected ? 'text-emerald-400 animate-pulse' : 'text-red-500'}`} />
              {socketConnected ? 'ENGINE_LINK_ONLINE' : 'ENGINE_OFFLINE'}
            </span>
          </div>
        </div>

        {/* Backend Offline Warning Banner */}
        {backendOffline && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <span>Backend Gateway Offline (Port 8000)</span>
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">Demo Mode</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Showing demonstrative models. For live RSS ingestion & Groq AI reasoning, start the backend with:
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-black/60 text-amber-300 font-mono text-[10px]">
                    uvicorn app.main:app --port 8000 --reload
                  </code>
                  or run
                  <code className="ml-1 px-1.5 py-0.5 rounded bg-black/60 text-amber-300 font-mono text-[10px]">
                    ./start.sh
                  </code>
                </div>
              </div>
            </div>
            <button
              onClick={() => fetchInitialData()}
              className="shrink-0 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Global Macro Index Widget */}
        <GlobalBiasIndexWidget data={globalIndex} />

        {/* Central Bank Policy & Speech NLP Sentiment Parser */}
        <CentralBankPolicyWidget policy={policy} />

        {/* Market Sessions Widget */}
        <MarketSessionsWidget />

        {/* Active Data Feeds Section */}
        {feeds.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Financial RSS Ingestion Feeds</h3>
              <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-blue-400" />
                FILTER: LAST 24 HOURS ONLY (STRICT)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {feeds.map((feed, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full ${feed.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-zinc-300">{feed.name}</span>
                  <span className="text-[8px] font-mono text-zinc-500 px-1.5 py-0.5 bg-black/40 rounded">{feed.url}</span>
                  <span className="text-[7px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded">24h Verified</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid of Bias Cards */}
        <div className="flex-1 pr-2 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {biases.map((item, idx) => {
              const style = getBiasStyles(item.bias);
              return (
                <div key={idx} className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5 hover:bg-zinc-900/40 transition-all flex flex-col justify-between group">

                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Target className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white">{item.asset_class}</h3>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{item.date}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${style.bg} ${style.border} ${style.color}`}>
                      {style.icon}
                      <span className="text-xs font-black uppercase tracking-wider">{item.bias}</span>
                    </div>
                  </div>

                  {/* Key Drivers */}
                  <div className="bg-black/30 border border-zinc-900/60 rounded-xl p-4 flex-1">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5">
                      <Activity className="w-3 h-3" /> Key Macro Drivers
                    </h4>
                    <ul className="space-y-2">
                      {item.key_drivers.map((driver, dIdx) => (
                        <li key={dIdx} className="text-xs text-zinc-300 font-sans flex items-start gap-2">
                          <span className="mt-1 text-blue-500/50 text-[10px]">▶</span>
                          <span className="leading-relaxed">{driver}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Fresh News Sources */}
                    {item.latest_news && item.latest_news.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <Globe className="w-3 h-3" /> Fresh News Sources
                          </h4>
                          <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Recent &lt; 24h
                          </span>
                        </div>
                        <ul className="space-y-3">
                          {item.latest_news.map((news, nIdx) => {
                            const pubDate = news.published_at ? new Date(news.published_at) : null;
                            const diffMinutes = pubDate ? Math.max(1, Math.round((Date.now() - pubDate.getTime()) / 60000)) : null;
                            const timeAgo = diffMinutes !== null
                              ? diffMinutes < 60
                                ? `${diffMinutes}m ago`
                                : `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m ago`
                              : '< 24h';

                            return (
                              <li key={nIdx} className="flex flex-col gap-1.5 p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/40">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    {news.source}
                                  </span>
                                  <span className="text-[8px] font-mono text-zinc-400 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-zinc-500" />
                                    {timeAgo}
                                  </span>
                                </div>
                                <a
                                  href={news.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-zinc-300 font-sans hover:text-white transition-colors truncate block"
                                  title={news.title}
                                >
                                  {news.title}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* AI Summarization */}
                    {item.ai_summary && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/50">
                        <div className={`border rounded-lg p-3 ${style.bg} ${style.border}`}>
                          <h4 className={`text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${style.color}`}>
                            <Cpu className="w-3 h-3" /> AI Summarization
                          </h4>
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            {item.ai_summary}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
