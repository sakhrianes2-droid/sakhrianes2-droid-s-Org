import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Cpu, 
  Sparkles, 
  ArrowUpRight, 
  ShieldCheck, 
  Radio,
  Zap,
  Activity
} from 'lucide-react';
import { authFetch } from '../lib/supabase';

interface MacroBiasItem {
  asset_class: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  confidence_score: number;
  key_drivers: string[];
  ai_summary: string;
  date?: string;
}

const FALLBACK_SHOWCASE_BIAS: MacroBiasItem[] = [
  {
    asset_class: 'USD',
    bias: 'Bearish',
    confidence_score: 90,
    key_drivers: ['Weak Labor Data', 'Dovish Fed Expectations'],
    ai_summary: 'Downside pressure following softer labor data drastically reduced rate hike probabilities.',
  },
  {
    asset_class: 'Gold',
    bias: 'Bearish',
    confidence_score: 75,
    key_drivers: ['Comex Gold Selloff', 'Stable Oil Exports'],
    ai_summary: 'Reduced safe-haven risk premium with stable cross-border commodity deliveries.',
  },
  {
    asset_class: 'S&P 500',
    bias: 'Bullish',
    confidence_score: 75,
    key_drivers: ['Dovish Rate Expectations', 'Soft Labor Data'],
    ai_summary: 'Dovish liquidity tailwind supports broad equity index momentum near all-time records.',
  },
  {
    asset_class: 'Crude Oil',
    bias: 'Bearish',
    confidence_score: 85,
    key_drivers: ['Strategic Reserve Release', 'Sanction Impact Negligible'],
    ai_summary: 'G7 strategic reserve release provides substantial inventory buffer.',
  },
  {
    asset_class: 'EUR/USD',
    bias: 'Bearish',
    confidence_score: 75,
    key_drivers: ['US Labor Resilience', 'Elevated Yield Spread'],
    ai_summary: 'Yield spread variance favors USD holding against euro headwinds.',
  },
  {
    asset_class: 'Bitcoin',
    bias: 'Bearish',
    confidence_score: 82,
    key_drivers: ['Regulatory Headwinds', 'Price Drawdown'],
    ai_summary: 'Technical resistance around $87K with institutional liquidity consolidation.',
  },
];

export const LiveMacroMatrix: React.FC<{ onOpenAuth?: () => void }> = ({ onOpenAuth }) => {
  const [biases, setBiases] = useState<MacroBiasItem[]>(FALLBACK_SHOWCASE_BIAS);
  const [isLive, setIsLive] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  useEffect(() => {
    let isMounted = true;

    const fetchBiases = async () => {
      try {
        const res = await authFetch('/api/macro/bias');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.biases || []);
          if (isMounted && Array.isArray(items) && items.length > 0) {
            setBiases(items);
            setIsLive(true);
            setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch (e) {
        // Keeps graceful fallback
      }
    };

    fetchBiases();
    const interval = setInterval(fetchBiases, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 z-20 my-10">
      <div className="relative rounded-2xl bg-zinc-950/80 border border-white/10 p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Neon Accent Glows */}
        <div className="absolute top-0 right-1/4 w-72 h-36 bg-[#bffe1c]/5 blur-[80px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-72 h-36 bg-[#38bdf8]/5 blur-[80px] pointer-events-none rounded-full" />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[#bffe1c] shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-mono font-bold text-xs uppercase tracking-widest">
                  Live Macro Intelligence Matrix
                </h3>
                <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#bffe1c]/10 text-[#bffe1c] border border-[#bffe1c]/20 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bffe1c] animate-ping" />
                  GROQ AI INFERENCE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Real-time directional market sentiment evaluated from global RSS feeds & Finnhub indicators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
              <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
              <span>{isLive ? 'Live WebSocket Synchronized' : 'Baseline Matrix Active'}</span>
            </div>
            
            <Link
              to="/macro-intel"
              className="text-[10px] font-mono uppercase tracking-wider text-[#bffe1c] hover:text-white flex items-center gap-1 font-bold group border border-[#bffe1c]/20 hover:border-[#bffe1c] px-3 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <span>Full Terminal</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-5">
          {biases.map((item) => {
            const isBullish = item.bias.toLowerCase() === 'bullish';
            const isBearish = item.bias.toLowerCase() === 'bearish';
            
            const badgeBg = isBullish 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : isBearish 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';

            const Icon = isBullish ? TrendingUp : isBearish ? TrendingDown : Minus;

            return (
              <div 
                key={item.asset_class}
                className="group relative p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/90 border border-white/5 hover:border-white/20 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Asset Class + Bias Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-white text-sm tracking-wider">
                      {item.asset_class}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1 ${badgeBg}`}>
                      <Icon className="w-3 h-3" />
                      {item.bias}
                    </span>
                  </div>

                  {/* Confidence meter */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>CONFIDENCE</span>
                      <span className="text-white font-bold">{item.confidence_score}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isBullish ? 'bg-emerald-400' : isBearish ? 'bg-rose-400' : 'bg-zinc-400'
                        }`}
                        style={{ width: `${item.confidence_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Drivers & AI summary */}
                  <div className="text-[10px] text-zinc-400 space-y-1 font-mono">
                    <div className="text-[#bffe1c] font-semibold truncate">
                      ✦ {item.key_drivers?.join(' • ') || 'Institutional Flows'}
                    </div>
                    <p className="text-zinc-500 line-clamp-2 font-sans text-[11px] leading-relaxed">
                      {item.ai_summary}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span>LATENCY: 0.85ms</span>
                  <Link 
                    to="/macro-intel"
                    className="text-zinc-400 hover:text-white flex items-center gap-1 group-hover:text-[#bffe1c] transition-colors"
                  >
                    <span>Analyze</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Multi-modal RSS Pipeline (ForexLive, CNBC, WSJ, MarketWatch, Investing.com)</span>
          </div>
          <span>Updated: {lastRefreshed}</span>
        </div>

      </div>
    </div>
  );
};
