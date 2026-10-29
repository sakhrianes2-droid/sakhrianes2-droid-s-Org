import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { INITIAL_SIGNALS, STRATEGY_BLOCKS, DEFAULT_RISK } from "./data";
import { TradingSignal, StrategyBlock, RiskProfile } from "./types";
import { SignalDetailModal } from "./components/SignalDetailModal";
import { DataIngestionFeed } from "./components/DataIngestionFeed";
import { LiveConsoleTerminal } from "./components/LiveConsoleTerminal";
import { PipelineCanvas } from "./components/PipelineCanvas";
import { useAuth } from "./context/AuthContext";
import { AuthModal } from "./components/auth/AuthModal";
import { LiveMacroMatrix } from "./components/LiveMacroMatrix";
import { 
  Compass, 
  ChevronDown, 
  Sparkles, 
  Sliders, 
  Terminal, 
  Activity, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  Shield, 
  Scale, 
  Filter, 
  Plus, 
  Trash2, 
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Orbit,
  ArrowRight,
  Info,
  DollarSign,
  Newspaper,
  TrendingUp,
  LayoutGrid,
  CornerDownRight,
  Globe,
  CalendarDays,
  Lock,
  LogOut,
  ShieldCheck,
  KeyRound,
  Radio,
  LogIn
} from "lucide-react";

const Starfield = () => {
  const stars = [
    { top: "8%", left: "12%", size: "w-0.5 h-0.5", opacity: "opacity-40" },
    { top: "42%", left: "85%", size: "w-1 h-1", opacity: "opacity-70" },
    { top: "68%", left: "8%", size: "w-0.5 h-0.5", opacity: "opacity-50" },
    { top: "15%", left: "78%", size: "w-1 h-1", opacity: "opacity-60" },
    { top: "88%", left: "92%", size: "w-0.5 h-0.5", opacity: "opacity-40" },
    { top: "28%", left: "38%", size: "w-0.5 h-0.5", opacity: "opacity-60" },
    { top: "58%", left: "28%", size: "w-1 h-1", opacity: "opacity-45" },
    { top: "22%", left: "94%", size: "w-0.5 h-0.5", opacity: "opacity-50" },
    { top: "78%", left: "48%", size: "w-1 h-1", opacity: "opacity-55" },
  ];
  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
      {stars.map((s, idx) => (
        <div
          key={idx}
          className={`star absolute bg-white/80 rounded-full ${s.size} ${s.opacity} animate-pulse`}
          style={{ top: s.top, left: s.left }}
        />
      ))}
    </div>
  );
};

// custom breaking news dataset for automated mock ingestion
const MOCK_FINANCIAL_POOL = [
  {
    newsSource: "Bloomberg / Fed",
    headline: "Federal Reserve unexpectedly announces sudden liquidity window facilities",
    sentiment: 88,
    action: "BUY" as const,
    asset: "ES-1NDX Index",
    price: 18450.00,
    latency: "0.85ms",
    volume: "15,000 contracts",
    profit: "+$32,100",
  },
  {
    newsSource: "WSJ Pro Tech",
    headline: "Regulatory advisory outlines sudden sub-second risk algorithm auditing protocols",
    sentiment: -68,
    action: "HEDGE" as const,
    asset: "NQ-100 Future",
    price: 18910.00,
    latency: "2.1ms",
    volume: "8,200 contracts",
    profit: "+$5,400",
  },
  {
    newsSource: "Reuters Commodity",
    headline: "Bespoke global sovereign fund initiates multitrillion dollar digital collateral rotation",
    sentiment: 94,
    action: "BUY" as const,
    asset: "BTC / USD",
    price: 68421.50,
    latency: "1.1ms",
    volume: "124 BTC",
    profit: "+$48,900",
  },
  {
    newsSource: "AP Wire",
    headline: "Unanticipated critical microconductor core fire delays global system production output",
    sentiment: -82,
    action: "SELL" as const,
    asset: "SOXX Microchips",
    price: 215.10,
    latency: "1.4ms",
    volume: "21,000 shares",
    profit: "+$18,300",
  },
  {
    newsSource: "S&P Global",
    headline: "Credit agency upgrades infrastructure benchmarks citing high-margin AI automated output",
    sentiment: 76,
    action: "BUY" as const,
    asset: "GLD Commodities",
    price: 2342.10,
    latency: "1.0ms",
    volume: "35,000 shares",
    profit: "+$11,850",
  }
];

export default function App() {
  // Navigation section tracker & workspace selector
  const [activeSection, setActiveSection] = useState("hero");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auth & Session States
  const { user, signOut, isConfigured, activityLogs } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'whitelist' | 'audit'>('signin');
  const [whitelistQuickEmail, setWhitelistQuickEmail] = useState('');

  // Auto-open login modal when redirected from protected routes
  useEffect(() => {
    if (location.state?.openLogin) {
      setIsAuthModalOpen(true);
      setAuthModalTab('signin');
    }
  }, [location.state]);

  // Custom Osmo Interactive States
  const [selectedOrbitFeed, setSelectedOrbitFeed] = useState<string>("bloomberg");
  const [vaultSubPage, setVaultSubPage] = useState<"hud" | "studio" | "risk" | "cli">("hud");

  // Core system states
  const [signals, setSignals] = useState<TradingSignal[]>(INITIAL_SIGNALS);
  const [risk, setRisk] = useState<RiskProfile>(DEFAULT_RISK);
  const [activeBlocks, setActiveBlocks] = useState<StrategyBlock[]>([
    STRATEGY_BLOCKS[0], // Breaking News trigger
    STRATEGY_BLOCKS[3], // Supernova AI classifier
    STRATEGY_BLOCKS[6], // Limit Block execution
  ]);

  // Overlays & Compilation states
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);
  const [showCompilerModal, setShowCompilerModal] = useState(false);

  // Autonomous Engine stats
  const [isEngineArmed, setIsEngineArmed] = useState(true);
  const [dailyProfit, setDailyProfit] = useState(64640);
  const [totalExecutedTrades, setTotalExecutedTrades] = useState(148);
  const [activeLiveAlert, setActiveLiveAlert] = useState<string | null>(null);

  // Ref to hold the auto-ticker interval
  const tickerRef = useRef<NodeJS.Timeout | null>(null);

  // requestAnimationFrame fade animation helper
  const rafFadeIn = (element: HTMLElement, duration = 1200) => {
    let start: number | null = null;
    element.style.opacity = "0";

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.min(progress / duration, 1);
      element.style.opacity = opacity.toString();

      if (progress < duration) {
        window.requestAnimationFrame(step);
      }
    }
    window.requestAnimationFrame(step);
  };

  // Section Observer for smooth aesthetic scrolling & fade-in transitions
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".viewport-section");
    const fadedSections = new Set<HTMLElement>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            setActiveSection(target.id);
            if (!fadedSections.has(target)) {
              fadedSections.add(target);
              rafFadeIn(target, 1000);
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: "-12% 0px -12% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Periodic Automated Simulated news ingestion when system status is ARMED and system is ONLINE
  useEffect(() => {
    if (isEngineArmed && isOnline) {
      tickerRef.current = setInterval(() => {
        if (Math.random() > 0.45) {
          triggerRandomIngestion();
        }
      }, 10000);
    } else {
      if (tickerRef.current) clearInterval(tickerRef.current);
    }

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [isEngineArmed, isOnline]);

  const sigCounterRef = useRef(1);

  const triggerRandomIngestion = () => {
    const randomIndex = Math.floor(Math.random() * MOCK_FINANCIAL_POOL.length);
    const item = MOCK_FINANCIAL_POOL[randomIndex];
    sigCounterRef.current += 1;
    const uniqueId = `sig-gen-${Date.now().toString().slice(-4)}-${sigCounterRef.current}`;

    // Calculate realistic boundaries
    const entry = item.price;
    const isBuy = item.action === "BUY";
    const sl = isBuy ? (entry * 0.98).toFixed(entry < 1000 ? 2 : 1) : (entry * 1.02).toFixed(entry < 1000 ? 2 : 1);
    const tp = isBuy ? (entry * 1.05).toFixed(entry < 1000 ? 2 : 1) : (entry * 0.95).toFixed(entry < 1000 ? 2 : 1);

    const newSignal: TradingSignal = {
      id: uniqueId,
      time: new Date().toTimeString().split(' ')[0],
      newsSource: item.newsSource,
      headline: item.headline,
      sentiment: item.sentiment,
      action: item.action,
      asset: item.asset,
      latency: item.latency,
      volume: item.volume,
      profit: item.profit,
      status: "COMPLETED",
      entryPrice: entry.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      stopLoss: sl,
      takeProfit: tp
    };

    setSignals((prev) => [newSignal, ...prev.filter((s) => s.id !== newSignal.id).slice(0, 8)]);
    
    // Update telemetry statistics
    const rawVal = parseInt(item.profit.replace(/[^0-9]/g, "")) || 5000;
    const isAdding = item.sentiment >= 0;
    setDailyProfit((prev) => prev + (isAdding ? rawVal : -rawVal * 0.15));
    setTotalExecutedTrades((prev) => prev + 1);

    // Flashing system alert
    setActiveLiveAlert(`[AI SIGNAL] OUTWARD POSITION FILLED: ${item.action} ${item.asset}`);
    setTimeout(() => setActiveLiveAlert(null), 4500);
  };

  const handlesScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Liquidation override logic (stops engine, flushes alert)
  const handleManualLiquidation = () => {
    setIsEngineArmed(false);
    setActiveLiveAlert("⚠️ RISK EMERGENCY OVERRIDE TRIGGERED • ALL TRADE VECTORS LIQUIDATED!");
    setTimeout(() => setActiveLiveAlert(null), 6000);
  };

  // Compile Deploy action modal trigger
  const handleCompileDeploy = () => {
    if (activeBlocks.length === 0) {
      alert("Please assemble at least one block inside your strategy workshop grid.");
      return;
    }
    setCompiling(true);
    setShowCompilerModal(true);
    setCompilerLogs(["Initializing Supernova AI high-speed compilation core..."]);

    const runLogs = [
      `Establishing logical grid layout containing ${activeBlocks.length} target gates...`,
      "Synthesizing high-speed WebAssembly binary vectors...",
      "Simulating dark pool routing latency bounds... SECURE (0.85ms average)",
      "Syncing physical bare-metal risk parameters...",
      `Deploying compiled parameters: Max Leverage: ${risk.maxLeverage}x, Drawdown: ${risk.drawdownCap}%`,
      "Synchronizing system telemetry matrix... OK",
      "SaaS strategy compilation complete. Server loop has been armed successfully!"
    ];

    runLogs.forEach((log, idx) => {
      setTimeout(() => {
        setCompilerLogs((prev) => [...prev, log]);
        if (idx === runLogs.length - 1) {
          setCompiling(false);
          setActiveLiveAlert("STRATEGY DISPATCHED TO BARE-METAL SERVERS");
          setTimeout(() => setActiveLiveAlert(null), 4000);
        }
      }, (idx + 1) * 350);
    });
  };

  // Sync canvas to parent
  const handleSyncPipeline = (syncedNodes: StrategyBlock[]) => {
    setActiveBlocks(syncedNodes);
  };

  // Metadata for the 7 news ingestion sources for the orbital interactive dial
  const FEED_METADATA: Record<string, { name: string; latency: string; integrity: string; freq: string; desc: string }> = {
    bloomberg: { name: "Bloomberg Terminal RSS Gateway", latency: "0.85ms", integrity: "99.8%", freq: "42 cycles/sec", desc: "Institutional grade RSS queue monitored by persistent sub-second pollers to instantly intercept central bank liquidity facilities and interest rate changes." },
    cnbc: { name: "CNBC International Feed Scraper", latency: "1.25ms", integrity: "98.7%", freq: "15 cycles/sec", desc: "Corporate flash disclosures and macroeconomic wire summaries parsed in under 12 milliseconds to frontrun general retail reaction." },
    coindesk: { name: "CoinDesk Core WebSockets", latency: "1.10ms", integrity: "99.1%", freq: "28 cycles/sec", desc: "Cryptocurrency market catalysts, decentralized protocol proposals, and on-chain whale address transfers detected directly." },
    yahoofit: { name: "Yahoo Finance Global Ingest", latency: "1.62ms", integrity: "96.4%", freq: "8 cycles/sec", desc: "Equities index listings and primary macro commodity indicators polled every minute to secure defensive hedge vectors." },
    forexlive: { name: "ForexLive High-Beta Wire", latency: "0.95ms", integrity: "99.5%", freq: "34 cycles/sec", desc: "High-speed fiat treasury indexes, currency exchange spot volumes, and inflation projections feeds synced in parallel." },
    reuters: { name: "Reuters Apex Wire scraper", latency: "1.05ms", integrity: "99.3%", freq: "30 cycles/sec", desc: "Direct fiber cable link to Reuters regional servers, parsing geopolitical reports and sovereign fund actions in milliseconds." },
    apwire: { name: "Associated Press Inflow Tunnel", latency: "1.45ms", integrity: "97.8%", freq: "12 cycles/sec", desc: "Secondary societal news aggregator, computing multi-sector raw sentiment indicators to cross-correlate macro assets." }
  };

  return (
    <div className="relative min-h-screen bg-[#050507] text-[#f4f4f6] selection:bg-[#5f5cf2]/30 font-body transition-colors duration-500 overflow-x-hidden">
      {!isOnline && (
        <div className="sticky top-0 left-0 right-0 z-[150] bg-rose-600 text-white text-[9px] font-mono tracking-widest font-black py-2.5 text-center uppercase border-b border-rose-700 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>SYSTEM OFFLINE: Internet connection lost. Ingestion pipeline suspended.</span>
        </div>
      )}
      {/* Top Continuous Ticker Bar (Osmo Styled Marquee in Lime Green) */}
      <div className="w-full bg-[#bffe1c] text-[#0a0a0c] py-2 overflow-hidden border-b border-white/10 select-none z-50 relative flex items-center">
        <div className="animate-marquee whitespace-nowrap flex text-[10px] font-mono uppercase tracking-widest gap-8">
          <span className="flex items-center gap-1">✦ PRO STATUS: ARMED & RUNNING ✦ LATENCY: 0.85ms ✦ sentiment analysis: GROQ INF ✦ TRADES EXECUTED: {totalExecutedTrades} ✦ DAILY PROFIT: ${dailyProfit.toLocaleString()} ✦ ACTIVE FEED PORT: 3000</span>
          <span className="flex items-center gap-1">✦ PRO STATUS: ARMED & RUNNING ✦ LATENCY: 0.85ms ✦ sentiment analysis: GROQ INF ✦ TRADES EXECUTED: {totalExecutedTrades} ✦ DAILY PROFIT: ${dailyProfit.toLocaleString()} ✦ ACTIVE FEED PORT: 3000</span>
          <span className="flex items-center gap-1">✦ PRO STATUS: ARMED & RUNNING ✦ LATENCY: 0.85ms ✦ sentiment analysis: GROQ INF ✦ TRADES EXECUTED: {totalExecutedTrades} ✦ DAILY PROFIT: ${dailyProfit.toLocaleString()} ✦ ACTIVE FEED PORT: 3000</span>
        </div>
      </div>

      {/* Real-time floating system alerts */}
      {activeLiveAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] text-center pointer-events-none select-none max-w-[90vw]">
          <div className="bg-[#5f5cf2]/90 text-white border border-[#bffe1c]/50 px-6 py-2.5 rounded-full backdrop-blur-xl text-[10px] font-mono tracking-widest uppercase flex items-center justify-center gap-2 animate-bounce shadow-xl shadow-black/80">
            <span className="w-2.5 h-2.5 rounded-full bg-[#bffe1c] animate-ping inline-block" />
            <span className="font-extrabold tracking-widest text-[#0a0a0c] uppercase">{activeLiveAlert}</span>
          </div>
        </div>
      )}

      {/* Navigation Header Panel - Aesthetic Alignment */}
      <nav 
        id="navbar"
        className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3.5 gap-4 bg-[#15151a]/95 backdrop-blur-xl max-w-[95vw] w-[1100px] border border-white/10 shadow-2xl rounded-full"
      >
        <span className="font-sans font-black tracking-tighter text-sm select-none uppercase text-white hover:text-[#bffe1c] transition-colors pr-2 flex items-center gap-2">
          <span>★ SUPERNOVA</span>
          <span className="bg-[#bffe1c] text-[#0a0a0c] text-[8px] font-mono px-1.5 py-0.2 rounded-full font-bold">V9 PRO</span>
          {isOnline ? (
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[8px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          ) : (
            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[8px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
              <span className="w-1 h-1 rounded-full bg-rose-400" />
              OFFLINE
            </span>
          )}
        </span>
        
        {/* Anchored sublinks */}
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => handlesScrollTo("hero")}
            className={`text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer ${
              activeSection === "hero" ? "text-[#bffe1c] font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Uptime
          </button>
          <button 
            onClick={() => handlesScrollTo("feed-orbits")}
            className={`text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer ${
              activeSection === "feed-orbits" ? "text-[#bffe1c] font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Core Feeds
          </button>
          <button 
            onClick={() => handlesScrollTo("vault-platform")}
            className={`text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer ${
              activeSection === "vault-platform" ? "text-[#bffe1c] font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            The Vault
          </button>
          <Link 
            to="/dashboard"
            className="text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer text-zinc-400 hover:text-white"
          >
            Dashboard
          </Link>
          <Link 
            to="/macro-intel"
            className="text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer text-zinc-400 hover:text-[#bffe1c] flex items-center gap-1.5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/5"
          >
            <Globe className="w-3 h-3" />
            Macro Intel
          </Link>
          <Link 
            to="/calendar"
            className="text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer text-zinc-400 hover:text-[#bffe1c] flex items-center gap-1.5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/5"
          >
            <CalendarDays className="w-3 h-3" />
            Calendar
          </Link>

          {/* Audit Telemetry Stream trigger */}
          <button
            onClick={() => {
              setAuthModalTab('audit');
              setIsAuthModalOpen(true);
            }}
            className="text-[9px] tracking-widest font-mono uppercase transition-colors cursor-pointer text-zinc-400 hover:text-[#5f5cf2] flex items-center gap-1.5 border border-white/10 px-2.5 py-1.5 rounded-full hover:bg-white/5"
            title="Inspect Live Postgres / Enclave Access Telemetry"
          >
            <Terminal className="w-3 h-3 text-[#5f5cf2]" />
            Logs
          </button>

          {/* Auth Action Area */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <Link
                to="/macro-intel"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[9px] font-mono font-bold tracking-wider transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[110px] truncate">{user.email?.split('@')[0]}</span>
              </Link>
              <button
                onClick={signOut}
                className="p-1.5 rounded-full bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
                title="Sign Out of Enclave"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <button
                onClick={() => {
                  setAuthModalTab('whitelist');
                  setIsAuthModalOpen(true);
                }}
                className="text-[9px] tracking-widest font-mono uppercase text-[#38bdf8] hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-full hover:bg-white/5"
              >
                Beta Access
              </button>
              <button
                onClick={() => {
                  setAuthModalTab('signin');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#bffe1c] hover:bg-[#aee619] text-black text-[9px] font-mono font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(191,254,28,0.3)] hover:scale-105 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* VIEWPORT CONTROLS */}
      <main className="pt-24">
          
          {/* Section 1: Hero Entry Statement in Osmo Style */}
          <section 
            id="hero" 
            className="viewport-section min-h-screen flex flex-col justify-center items-center relative overflow-hidden px-4 py-16"
            style={{ opacity: 0 }}
          >
            <Starfield />

            {/* Space background cinematic video loop */}
            <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] object-cover object-top -z-10 select-none pointer-events-none opacity-[0.12] mix-blend-screen"
            >
              <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4" type="video/mp4" />
            </video>
            
            <div className="text-center z-10 px-6 max-w-5xl mt-8 flex flex-col items-center">
              
              {/* Premium Top Line */}
              <div className="flex justify-center items-center gap-2 text-[#bffe1c] uppercase tracking-[0.4em] text-[10px] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-[#bffe1c] animate-ping inline-block" />
                <span className="font-mono">Supernova Arbitrage Protocol</span>
              </div>
              
              {/* Giant Editorial Title */}
              <h1 className="font-sans font-black text-5xl sm:text-7xl md:text-[100px] leading-[0.9] -tracking-[0.04em] text-white py-2 max-w-4xl">
                Quantum Inflow. <br />
                <span className="text-zinc-600 italic font-light font-heading">Built to Frontrun.</span>
              </h1>
              
              {/* Elegant handwritten peach text annotation exactly like Snellenberg */}
              <span className="writing-italic text-lg sm:text-2xl mt-4 block">
                *( Parallel routing on physical proxy ports in under 0.85ms )
              </span>
              
              <p className="font-sans font-light text-zinc-400 tracking-wide max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed mt-6">
                Constantly digesting unstructured global news flow using dedicated Groq AI inference sockets. Trade signals are automatically structured and placed across regional dark pool liquidity blocks within milliseconds.
              </p>

              {/* Tilted interactive hover card deck mimicking Osmo's product modules */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mt-12 mb-8">
                
                <div className="momentum-card-left p-6 rounded-[28px] bg-[#15151a] border border-[#bffe1c]/20 hover:border-[#bffe1c] text-left transition-all relative overflow-hidden flex flex-col justify-between h-[180px]">
                  <div>
                    <span className="text-[#bffe1c] font-mono text-[9px] uppercase block tracking-widest">MODULE 01</span>
                    <span className="text-[17px] font-heading italic text-stone-200 mt-1 block">Groq AI Weights</span>
                  </div>
                  <div>
                    <span className="text-3xl font-mono text-white tracking-widest font-extrabold">+94%</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-0.5">Average Bullish Bias Log</span>
                  </div>
                  <span className="absolute bottom-4 right-4 text-zinc-700 font-sans text-xs select-none">✦</span>
                </div>

                <div className="momentum-card p-6 rounded-[28px] bg-[#15151a] border border-[#5f5cf2]/30 hover:border-[#5f5cf2] text-left transition-all relative overflow-hidden flex flex-col justify-between h-[180px]">
                  <div>
                    <span className="text-[#a855f7] font-mono text-[9px] uppercase block tracking-widest">MODULE 02</span>
                    <span className="text-[17px] font-heading italic text-stone-200 mt-1 block">Dark-Pool Gate</span>
                  </div>
                  <div>
                    <span className="text-3xl font-mono text-[#bffe1c] tracking-widest font-extrabold">0.85ms</span>
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase mt-0.5">Proxy Fiber Route Limit</span>
                  </div>
                  <span className="absolute bottom-4 right-4 text-zinc-700 font-sans text-xs select-none">✦</span>
                </div>

                <div className="momentum-card-left p-6 rounded-[28px] bg-[#15151a] border border-white/5 hover:border-white/20 text-left transition-all relative overflow-hidden flex flex-col justify-between h-[180px]">
                  <div>
                    <span className="text-zinc-500 font-mono text-[9px] uppercase block tracking-widest">MODULE 03</span>
                    <span className="text-[17px] font-heading italic text-stone-200 mt-1 block">Titanium Guard</span>
                  </div>
                  <div>
                    <span className="text-3xl font-mono text-stone-300 tracking-tight font-extrabold">100%</span>
                    <span className="text-[9px] font-mono text-[#fca5a5] block uppercase mt-0.5">Sovereign Delta hedge</span>
                  </div>
                  <span className="absolute bottom-4 right-4 text-zinc-700 font-sans text-xs select-none">✦</span>
                </div>

              </div>

              {/* Action Buttons with high-impact dual CTAs */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-lg z-20">
                {user ? (
                  <Link
                    to="/macro-intel"
                    className="bg-[#bffe1c] hover:bg-[#aee619] text-black w-full sm:w-auto px-8 py-3.5 font-mono font-black text-xs tracking-[0.15em] uppercase transition-all hover:scale-[1.03] active:scale-95 border-none cursor-pointer rounded-full shadow-[0_0_25px_rgba(191,254,28,0.4)] flex items-center justify-center gap-2"
                  >
                    <span>🚀 Launch Macro Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button 
                    onClick={() => {
                      setAuthModalTab('signin');
                      setIsAuthModalOpen(true);
                    }}
                    className="bg-[#bffe1c] hover:bg-[#aee619] text-black w-full sm:w-auto px-8 py-3.5 font-mono font-black text-xs tracking-[0.15em] uppercase transition-all hover:scale-[1.03] active:scale-95 border-none cursor-pointer rounded-full shadow-[0_0_25px_rgba(191,254,28,0.4)] flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Launch Macro Terminal</span>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setAuthModalTab('whitelist');
                    setIsAuthModalOpen(true);
                  }}
                  className="bg-[#15151a] border border-white/20 hover:border-[#38bdf8] hover:bg-[#38bdf8]/10 w-full sm:w-auto px-7 py-3.5 font-mono font-bold text-xs tracking-[0.15em] uppercase transition-all active:scale-95 text-[#f4f4f6] cursor-pointer rounded-full flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                  <span>Request Early Access</span>
                </button>
              </div>

              {/* Sub-hero Live Macro Intelligence Matrix Showcase */}
              <LiveMacroMatrix onOpenAuth={() => {
                setAuthModalTab('signin');
                setIsAuthModalOpen(true);
              }} />

            </div>

            {/* Scroll Down Trigger */}
            <button 
              onClick={() => handlesScrollTo("feed-orbits")}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 hover:text-white text-zinc-600 transition-colors uppercase tracking-[0.2em] text-[8px] cursor-pointer"
            >
              <span>Explore Ingestion Loop</span>
              <ChevronDown size={14} className="animate-bounce text-[#bffe1c]" />
            </button>
          </section>

          {/* Section 2: Pure Snellenberg Double Circular Orbit Wheel of Feeds */}
          <section 
            id="feed-orbits"
            className="viewport-section min-h-screen relative overflow-hidden py-24 px-6 bg-[#08080b] border-t border-white/5 flex flex-col justify-center items-center"
            style={{ opacity: 0 }}
          >
            <Starfield />

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 relative">
              
              {/* Left Side: Orb description details in rich editorial style */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <span className="text-[10px] tracking-[0.3em] text-[#5f5cf2] uppercase font-mono block font-black">INGESTION CHANNELS ORBITS</span>
                <h2 className="font-sans font-black text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-none">
                  Sovereign News <br />
                  <span className="text-[#bffe1c] font-heading italic font-light">Dial Matrix.</span>
                </h2>
                
                <p className="text-zinc-400 font-sans text-sm font-light leading-relaxed max-w-xl">
                  Click on any active feed node floating on the orbiting rings to examine its microsecond metrics, network latency boundaries, and hardware integrity score.
                </p>

                {/* Hand-drawn style pointing note */}
                <div className="flex items-center gap-2 pl-1.5">
                  <span className="text-rose-400 font-sans text-base">⤿</span>
                  <span className="writing-italic text-sm">Tap nodes anytime to test the AI analyzer</span>
                </div>

                {/* Selected Node Detailed Editorial Card */}
                <div className="p-6 rounded-[28px] bg-[#111115] border border-white/5 space-y-4 shadow-xl">
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[14px] font-heading italic text-[#bffe1c] block font-bold">
                        {FEED_METADATA[selectedOrbitFeed]?.name}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">FEED ADDRESS CONFIG LOADED</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#5f5cf2]/10 border border-[#5f5cf2]/30 text-[#5f5cf2] text-[9px] font-mono rounded font-extrabold">LIVE</span>
                  </div>

                  <p className="text-xs text-zinc-300 font-sans font-light leading-relaxed">
                    "{FEED_METADATA[selectedOrbitFeed]?.desc}"
                  </p>

                  <div className="grid grid-cols-3 gap-4 pt-1 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block uppercase text-[8px]">Inflow Overheads</span>
                      <span className="text-[#fca5a5] font-black block">{FEED_METADATA[selectedOrbitFeed]?.latency}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase text-[8px]">Scraper Integrity</span>
                      <span className="text-[#bffe1c] font-black block">{FEED_METADATA[selectedOrbitFeed]?.integrity}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase text-[8px]">Traffic Frequency</span>
                      <span className="text-stone-300 block font-bold">{FEED_METADATA[selectedOrbitFeed]?.freq}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Gigantic Double Orbit Dial Graphic */}
              <div className="lg:col-span-6 flex justify-center items-center relative h-[380px] sm:h-[450px]">
                
                {/* Dotted Radial Ring 1 */}
                <div className="absolute w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full border border-dotted border-white/10 flex justify-center items-center z-0 animate-spin" style={{ animationDuration: "120s" }}>
                  {/* Floating elements inside outer ring */}
                  <div className="absolute -top-3 left-1/2 w-3 h-3 rounded-full bg-[#5f5cf2]" />
                  <div className="absolute top-1/2 -right-1.5 w-1.5 h-1.5 rounded-full bg-[#bffe1c]" />
                  <div className="absolute bottom-1/3 -left-2 w-2 h-2 rounded-full bg-orange-400" />
                </div>

                {/* Dotted Radial Ring 2 (Inner) */}
                <div className="absolute w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-full border border-dashed border-white/10 z-0 animate-spin" style={{ animationDuration: "80s" }} />

                {/* Pulsing Core Action Button */}
                <button
                  onClick={() => {
                    triggerRandomIngestion();
                  }}
                  className="absolute w-[120px] h-[120px] rounded-full bg-[#5f5cf2] hover:bg-[#524ff0] text-white font-mono text-[9px] font-black uppercase tracking-widest transition-all hover:scale-110 active:scale-95 shadow-xl shadow-[#5f5cf2]/30 flex flex-col justify-center items-center gap-1 z-20 cursor-pointer border-none"
                >
                  <span className="text-[13px] font-heading italic block text-[#bffe1c]">Simulate</span>
                  <span>BREAKING NEWS</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bffe1c] animate-ping mt-1" />
                </button>

                {/* Floating click triggers representing the 7 feeds */}
                <button 
                  onClick={() => setSelectedOrbitFeed("bloomberg")}
                  className={`absolute top-[40px] left-[13%] sm:left-[20%] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "bloomberg" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-400 border-white/5 hover:text-white"
                  }`}
                >
                  ★ Bloomberg
                </button>

                <button 
                  onClick={() => setSelectedOrbitFeed("reuters")}
                  className={`absolute top-[30px] right-[15%] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "reuters" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-400 border-white/5 hover:text-white"
                  }`}
                >
                  Reuters
                </button>

                <button 
                  onClick={() => setSelectedOrbitFeed("coindesk")}
                  className={`absolute top-[48%] -right-[15px] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "coindesk" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-300 border-white/5 hover:text-white"
                  }`}
                >
                  ⚛ CoinDesk
                </button>

                <button 
                  onClick={() => setSelectedOrbitFeed("cnbc")}
                  className={`absolute bottom-[40px] right-[10%] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "cnbc" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-400 border-white/5 hover:text-white"
                  }`}
                >
                  CNBC
                </button>

                <button 
                  onClick={() => setSelectedOrbitFeed("forexlive")}
                  className={`absolute bottom-[20px] left-[25%] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "forexlive" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-400 border-white/5 hover:text-white"
                  }`}
                >
                  ForexLive
                </button>

                <button 
                  onClick={() => setSelectedOrbitFeed("yahoofit")}
                  className={`absolute top-[45%] -left-[30px] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "yahoofit" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-400 border-white/5 hover:text-white"
                  }`}
                >
                  Yahoo Fin
                </button>

                <button 
                  onClick={() => setSelectedOrbitFeed("apwire")}
                  className={`absolute bottom-[110px] left-[5%] text-[10px] font-mono px-3 py-1 rounded-full border transition-all z-10 cursor-pointer ${
                    selectedOrbitFeed === "apwire" ? "bg-[#bffe1c] text-[#0a0a0c] border-transparent font-black" : "bg-black/85 text-zinc-400 border-white/5 hover:text-white"
                  }`}
                >
                  AP News
                </button>

              </div>

            </div>
          </section>

          {/* Section 3: The "Platform Suite" Interactive Vault Dashboard Simulator */}
          <section
            id="vault-platform"
            className="viewport-section min-h-screen relative overflow-hidden py-24 px-6 bg-[#040406]"
            style={{ opacity: 0 }}
          >
            <Starfield />

            <div className="z-10 w-full max-w-7xl flex flex-col space-y-10">
              
              {/* Luxury Section Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
                <div>
                  <span className="text-[10px] tracking-[0.25em] text-[#5f5cf2] uppercase font-mono block font-bold">THE ULTIMATE COMMAND ENGINE</span>
                  <h2 className="font-sans font-black text-4xl md:text-5xl text-white tracking-tight leading-none mt-1">
                    The Platform <br />
                    <span className="text-zinc-500 font-heading italic font-light">Sovereign Vault Suite.</span>
                  </h2>
                </div>

                {/* Compact system statistics indicators */}
                <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-[#111116] border border-white/5 text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-zinc-500 uppercase">Gross Proceeds</span>
                    <span className="text-xs text-[#bffe1c] font-bold block">${dailyProfit.toLocaleString()}</span>
                  </div>
                  <div className="w-[1px] h-6 bg-white/10" />
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-zinc-500 uppercase">Traces Indexed</span>
                    <span className="text-xs text-stone-200 font-bold block">{totalExecutedTrades} fills</span>
                  </div>
                  <div className="w-[1px] h-6 bg-white/10" />
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-zinc-500 uppercase block">Engine State</span>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isEngineArmed ? "bg-emerald-400" : "bg-rose-500"}`} />
                      <span className={isEngineArmed ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                        {isEngineArmed ? "ARMED" : "HALTED"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Giant Browser Frame Mockup Container */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
                
                {/* Left Drawer Controller selector (The Dennis Snellenberg navigation index list) */}
                <div className="lg:col-span-3 flex flex-col justify-start space-y-2 text-left bg-zinc-950/20 p-3 rounded-[28px] border border-white/5">
                  <div className="p-3 pb-2 border-b border-white/5">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Workspace Console List</span>
                    <span className="text-xs text-white font-bold block mt-0.5">Tactical Access Units</span>
                  </div>

                  <button
                    onClick={() => setVaultSubPage("hud")}
                    className={`p-4 rounded-2xl text-left font-mono tracking-wide text-xs transition-all uppercase flex items-center justify-between cursor-pointer ${
                      vaultSubPage === "hud" 
                        ? "bg-[#5f5cf2] text-white font-extrabold" 
                        : "text-zinc-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <span>01 / Command Deck HUD</span>
                    <CornerDownRight size={12} className={vaultSubPage === "hud" ? "opacity-100" : "opacity-20"} />
                  </button>

                  <button
                    onClick={() => setVaultSubPage("studio")}
                    className={`p-4 rounded-2xl text-left font-mono tracking-wide text-xs transition-all uppercase flex items-center justify-between cursor-pointer ${
                      vaultSubPage === "studio" 
                        ? "bg-[#5f5cf2] text-white font-extrabold" 
                        : "text-zinc-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <span>02 / Logic Strategies Editor</span>
                    <CornerDownRight size={12} className={vaultSubPage === "studio" ? "opacity-100" : "opacity-20"} />
                  </button>

                  <button
                    onClick={() => setVaultSubPage("risk")}
                    className={`p-4 rounded-2xl text-left font-mono tracking-wide text-xs transition-all uppercase flex items-center justify-between cursor-pointer ${
                      vaultSubPage === "risk" 
                        ? "bg-[#5f5cf2] text-white font-extrabold" 
                        : "text-zinc-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <span>03 / Safe-Haven Limits</span>
                    <CornerDownRight size={12} className={vaultSubPage === "risk" ? "opacity-100" : "opacity-20"} />
                  </button>

                  <button
                    onClick={() => setVaultSubPage("cli")}
                    className={`p-4 rounded-2xl text-left font-mono tracking-wide text-xs transition-all uppercase flex items-center justify-between cursor-pointer ${
                      vaultSubPage === "cli" 
                        ? "bg-[#5f5cf2] text-white font-extrabold" 
                        : "text-zinc-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    <span>04 / Neural terminal cli</span>
                    <CornerDownRight size={12} className={vaultSubPage === "cli" ? "opacity-100" : "opacity-20"} />
                  </button>

                  <div className="pt-4 mt-auto p-4 bg-white/[0.01] border border-white/5 rounded-2xl font-mono text-[9px] text-zinc-500">
                    <span className="block font-bold">PORT: 3000 Ingress</span>
                    <span className="block text-zinc-600 mt-1">Compiled securely under Supernova Kernel assemblies.</span>
                  </div>
                </div>

                {/* Right Area: Large Screen view showcasing the selected dashboard tool beautifully compiled */}
                <div className="lg:col-span-9 bg-[#0e0e12] rounded-[32px] border border-white/10 p-4 sm:p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden">
                  
                  {/* Outer Frame Top Chrome bar */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 opacity-60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 opacity-60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 opacity-60" />
                      <span className="text-zinc-500 ml-2 tracking-wide uppercase">supernova://quantum_vault/session_01</span>
                    </div>

                    <div className="text-zinc-600 text-[9px] uppercase tracking-widest hidden sm:block">
                      {vaultSubPage === "hud" && "★ Interactive Port HUD Enabled"}
                      {vaultSubPage === "studio" && "⚛ Visual compiler nodes loaded"}
                      {vaultSubPage === "risk" && "🛡 Drawdown Safeties and limits"}
                      {vaultSubPage === "cli" && "⌨ Command Line Terminal armed"}
                    </div>
                  </div>

                  {/* SUBPAGE DISPATCHING VIEWPORT */}
                  <div className="flex-1 min-h-[460px]">
                    {vaultSubPage === "hud" && (
                      <div className="space-y-6 animate-fadeIn py-2 h-full">
                        {/* WebSocket streaming prices + news scrapper columns */}
                        <DataIngestionFeed onInjectSignal={triggerRandomIngestion} />

                        {/* Net catalyst display logs */}
                        <div className="liquid-glass p-0.5 rounded-[24px]">
                          <div className="bg-zinc-950 p-5 rounded-[22px] space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[9px] font-mono text-[#5f5cf2] uppercase block font-black">• DETAILED TRANSACTION LEDGER</span>
                                <h4 className="font-heading text-xl italic font-normal text-white">Ingested Catalyst Audit</h4>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500">Row clicks audit nanosecond paths</span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left min-w-[500px] font-mono text-xs">
                                <thead>
                                  <tr className="border-b border-white/5 text-[9px] tracking-widest text-zinc-500 uppercase bg-white/[0.01]">
                                    <th className="py-2.5 px-3">Asset / Symbol</th>
                                    <th className="py-2.5 px-3">Direct Match</th>
                                    <th className="py-2.5 px-3">Entry pricing</th>
                                    <th className="py-2.5 px-3">Stop Loss</th>
                                    <th className="py-2.5 px-3">Take Profit</th>
                                    <th className="py-2.5 px-3 text-right">Profit net</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {signals.map((sig) => (
                                    <tr
                                      key={sig.id}
                                      onClick={() => setSelectedSignal(sig)}
                                      className="hover:bg-white/[0.03] transition-all cursor-pointer group"
                                    >
                                      <td className="py-2.5 px-3">
                                        <div className="font-semibold text-white group-hover:text-[#bffe1c] transition-all">{sig.asset}</div>
                                        <span className="text-[8px] text-zinc-500 block">{sig.time} • {sig.id}</span>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                                          sig.action === "BUY" ? "bg-emerald-500/10 text-emerald-400" :
                                          sig.action === "SELL" ? "bg-rose-500/10 text-rose-400" : "bg-[#5f5cf2]/10 text-[#5f5cf2]"
                                        }`}>
                                          {sig.action}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-zinc-300 font-bold">{sig.entryPrice || "Pending"}</td>
                                      <td className="py-2.5 px-3 text-rose-400/80">{sig.stopLoss || "None"}</td>
                                      <td className="py-2.5 px-3 text-emerald-400/80">{sig.takeProfit || "None"}</td>
                                      <td className={`py-2.5 px-3 text-right font-black ${
                                        sig.profit.startsWith("+") ? "text-emerald-400" : "text-rose-400"
                                      }`}>
                                        {sig.profit}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {vaultSubPage === "studio" && (
                      <div className="space-y-6 animate-fadeIn py-2">
                        {/* Drag canvas blocks */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-2 border-b border-white/5">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-[#5f5cf2] uppercase block font-bold">• ZERO-CODE COMPILER WORKSHOP</span>
                            <h4 className="font-heading text-xl italic font-normal text-white">Pipeline Canvas workshop</h4>
                          </div>
                          
                          <button
                            onClick={handleCompileDeploy}
                            className="bg-[#5f5cf2] hover:bg-[#5f5cf2]/90 text-white text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-full font-bold shadow transition-all cursor-pointer border-none"
                          >
                            Compile on proxy nodes ↗
                          </button>
                        </div>

                        <PipelineCanvas 
                          onSync={handleSyncPipeline} 
                          activeBlocks={activeBlocks} 
                        />
                      </div>
                    )}

                    {vaultSubPage === "risk" && (
                      <div className="space-y-6 animate-fadeIn py-2 h-full">
                        {/* Risk limits and sliders */}
                        <div className="pb-3 border-b border-white/5">
                          <span className="text-[10px] font-mono text-[#5f5cf2] uppercase block font-bold">• SECURITY PARAMETERS CONTROLLER</span>
                          <h4 className="font-heading text-xl italic font-normal text-white">Exposure boundaries safeties</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[10px] text-zinc-400 pt-2">
                          <div className="space-y-2 p-4 rounded-2xl bg-zinc-950/50 border border-white/5">
                            <div className="flex justify-between items-center text-white font-bold">
                              <span>Max leverage</span>
                              <span className="text-[#bffe1c]">{risk.maxLeverage}x</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="50"
                              step="5"
                              value={risk.maxLeverage}
                              onChange={(e) => setRisk((prev) => ({ ...prev, maxLeverage: Number(e.target.value) }))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#5f5cf2]"
                            />
                            <span className="block text-[8px] text-zinc-600">Limits credit leverage on asset positions.</span>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-zinc-950/50 border border-white/5">
                            <div className="flex justify-between items-center text-white font-bold">
                              <span>Max sizing exposure</span>
                              <span className="text-[#bffe1c]">{risk.exposureLimit}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="90"
                              step="5"
                              value={risk.exposureLimit}
                              onChange={(e) => setRisk((prev) => ({ ...prev, exposureLimit: Number(e.target.value) }))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#5f5cf2]"
                            />
                            <span className="block text-[8px] text-zinc-600">Max portfolio percentage committed.</span>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-zinc-950/50 border border-white/5">
                            <div className="flex justify-between items-center text-white font-bold">
                              <span>Drawdown limit cap</span>
                              <span className="text-rose-400">{risk.drawdownCap}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="10.0"
                              step="0.5"
                              value={risk.drawdownCap}
                              onChange={(e) => setRisk((prev) => ({ ...prev, drawdownCap: Number(e.target.value) }))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-400"
                            />
                            <span className="block text-[8px] text-zinc-600">Triggers mechanical halts.</span>
                          </div>
                        </div>

                        {/* Toggle safes & checkboxes */}
                        <div className="p-5 rounded-2xl bg-[#111116] border border-white/5 space-y-4 text-xs">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="autoHaltInput"
                              checked={risk.autoHaltEnabled}
                              onChange={(e) => setRisk((prev) => ({ ...prev, autoHaltEnabled: e.target.checked }))}
                              className="mt-1 border-white/10 rounded cursor-pointer accent-[#5f5cf2] w-4 h-4"
                            />
                            <label htmlFor="autoHaltInput" className="cursor-pointer">
                              <span className="text-white font-bold uppercase tracking-wider block text-[11px]">Enable Mechanical drawDown Emergency halt</span>
                              <span className="text-zinc-500 block mt-0.5 leading-normal">Immediately detach active websocket channels, delete all active exchange limit contracts, and close exposures to sovereign treasuries in the event that active drawdown is breached.</span>
                            </label>
                          </div>

                          <div className="pt-3 border-t border-white/5">
                            <span className="text-white font-bold uppercase tracking-wider block text-[10px] mb-2">Safe-Haven Vault Allocation Assets</span>
                            <div className="flex flex-wrap gap-2">
                              {risk.safeHavenAssets.map((asset, idx) => (
                                <span key={idx} className="bg-white/5 border border-white/10 text-[9px] text-[#bffe1c] px-3 py-1 rounded-full font-mono font-bold">
                                  {asset}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {vaultSubPage === "cli" && (
                      <div className="space-y-6 animate-fadeIn py-2">
                        {/* Terminal simulator widget */}
                        <LiveConsoleTerminal 
                          isArmed={isEngineArmed} 
                          onSetArmed={setIsEngineArmed} 
                          onForceCloseAll={handleManualLiquidation} 
                          isOnline={isOnline}
                        />
                      </div>
                    )}
                  </div>

                  {/* Browser simulated footer */}
                  <div className="text-[9px] font-mono text-zinc-600 border-t border-white/5 pt-3 mt-4 flex justify-between items-center px-2">
                    <span>* DEPLOYED UNDER CRYPTOGRAPHIC CERTIFICATES DEEP POOL PROXY LIMIT CODES</span>
                    <span>100% REGULATED SEC COMPLIANT</span>
                  </div>

                </div>

              </div>

            </div>
          </section>

          {/* Section 4: Highly-Styled Snellenberg-inspired Bento Grid Gallery */}
          <section className="py-24 px-6 max-w-7xl mx-auto space-y-8 z-10 relative">
            
            <div className="text-center space-y-2 mb-12">
              <span className="text-[10px] tracking-[0.3em] text-[#5f5cf2] font-mono uppercase block font-bold">SYSTEM DATA SPECIFICATIONS SUMMARY</span>
              <h2 className="text-4xl font-sans font-black text-white tracking-tight leading-none">
                Platform <span className="text-[#bffe1c] font-heading italic font-light">Bento Overview.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Box A: Dennis Snellenberg profile styled customer card (Purple) (Left 5 Cols) */}
              <div className="md:col-span-5 p-8 rounded-[38px] bg-[#5f5cf2] text-white flex flex-col justify-between h-[340px] relative overflow-hidden shadow-2xl">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-[#bffe1c] uppercase block tracking-widest font-bold">SOCIETY CLUSTERS</span>
                  <h3 className="text-2xl font-sans font-bold leading-tight tracking-tight uppercase">
                    Connect with <br />
                    Sovereign Operators.
                  </h3>
                  <span className="writing-italic text-sm text-peach-200 mt-1 block">
                    ( "The tool empowers immediate execution" )
                  </span>
                </div>

                <div className="relative mt-4">
                  {/* Overlapping simulated user icons */}
                  <div className="flex items-center -space-x-3">
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" className="w-9 h-9 rounded-full border-2 border-[#5f5cf2] object-cover" />
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80" className="w-9 h-9 rounded-full border-2 border-[#5f5cf2] object-cover" />
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80" className="w-9 h-9 rounded-full border-2 border-[#5f5cf2] object-cover" />
                    <img referrerPolicy="no-referrer" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80" className="w-9 h-9 rounded-full border-2 border-[#5f5cf2] object-cover" />
                    <div className="w-9 h-9 rounded-full bg-[#bffe1c] text-[#0a0a0c] border-2 border-[#5f5cf2] text-[10px] font-mono font-black flex items-center justify-center">
                      +2K
                    </div>
                  </div>
                  <span className="text-[10px] text-white/70 font-mono block mt-2">Active hedge operators & algorithmic developers.</span>
                </div>

                <Link 
                  to="/macro-intel"
                  className="w-12 h-12 rounded-full bg-white text-[#5f5cf2] hover:bg-[#bffe1c] hover:text-[#0a0a0c] transition-all flex items-center justify-center absolute bottom-8 right-8 shadow-md cursor-pointer text-lg font-bold"
                >
                  ↗
                </Link>
              </div>

              {/* Box B: Low queue benchmarks performance (Right 7 Cols) */}
              <div className="md:col-span-7 p-8 rounded-[38px] bg-[#15151a] border border-white/5 flex flex-col justify-between h-[340px] relative overflow-hidden">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-[#bffe1c] uppercase block tracking-widest font-bold">BENCHMARKS TESTING</span>
                  <h3 className="text-2xl font-sans text-stone-200 tracking-tight font-black uppercase">Sub-Millisecond Fiber Routes</h3>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 font-mono text-[10px]">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-500">TARGET CHANNEL IP</span>
                    <span className="text-[#bffe1c] font-black">AVERAGE DELAY</span>
                    <span className="text-zinc-500">STATE STATUS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Chicago Decent Vaults API</span>
                    <span className="text-stone-300 font-bold">0.82ms</span>
                    <span className="text-emerald-400 font-semibold">• ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Binance Live Tick WS In</span>
                    <span className="text-stone-300 font-bold">0.14ms</span>
                    <span className="text-emerald-400 font-semibold">• ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Frankfurt fiber proxy gates</span>
                    <span className="text-stone-300 font-bold">1.02ms</span>
                    <span className="text-emerald-400 font-semibold">• ACTIVE</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-zinc-500 leading-normal">
                  * Dynamic path tracer adjusts routes automatically utilizing regional DNS priority servers to avoid global network congestion barriers.
                </div>
              </div>

            </div>
          </section>

          {/* Section 5: Snellenberg Visual Pricing Tiers */}
          <section className="py-24 px-6 max-w-5xl mx-auto text-center space-y-12">
            
            <div className="space-y-3">
              <span className="text-[10px] tracking-[0.3em] text-[#5f5cf2] font-mono uppercase block font-bold">LICENSING EXCLUSIVES MATRIX</span>
              <h2 className="text-4xl text-white font-sans font-black tracking-tight leading-none uppercase">Sovereign Pricing Packages</h2>
              <span className="writing-italic text-lg block text-rose-300">
                Choose Quantum tier for direct physical proxy routing ↗
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left">
              
              {/* Standard tier */}
              <div className="p-8 rounded-[38px] bg-white text-black flex flex-col justify-between h-[420px] relative transition-transform hover:scale-[1.01] shadow-xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline border-b border-black/10 pb-4">
                    <h4 className="text-xl font-mono font-bold uppercase text-zinc-600">Aperture Core</h4>
                    <div>
                      <span className="text-3xl font-black font-sans">$9,500</span>
                      <span className="text-[10px] uppercase block font-mono text-zinc-500 text-right">/ month</span>
                    </div>
                  </div>
                  <p className="text-xs font-sans text-zinc-600 leading-relaxed font-light">
                    Standard institutional SaaS package providing access to compiled news indicators, sentiment weights weights, and generic shared liquid router portals.
                  </p>
                  <ul className="space-y-2.5 pt-2 text-[10px] font-mono text-zinc-700">
                    <li className="flex items-center gap-2">✓ 7 RSS channels polling clusters</li>
                    <li className="flex items-center gap-2">✓ Standard Groq LPU inference pool</li>
                    <li className="flex items-center gap-2">✓ Standard 3.5ms average fill speed</li>
                  </ul>
                </div>

                <button 
                  onClick={() => alert("Contact setup desk: core_pricing@supernova-osmo.ai")}
                  className="w-full py-4 rounded-2xl bg-black text-white hover:bg-zinc-800 transition-all font-mono font-black text-xs uppercase tracking-widest text-center cursor-pointer border-none"
                >
                  Request core access
                </button>
              </div>

              {/* Premium tier */}
              <div className="p-8 rounded-[38px] bg-[#5f5cf2] text-white flex flex-col justify-between h-[420px] relative transition-transform hover:scale-[1.01] shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#bffe1c] text-[#0a0a0c] px-4 py-1 text-[8px] font-mono tracking-widest font-black uppercase rounded-bl-3xl">
                  Hedge Exclusive
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-baseline border-b border-white/15 pb-4">
                    <div className="space-y-1">
                      <h4 className="text-xl font-mono font-black uppercase text-[#bffe1c]">Supernova Quantum</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black font-sans">$24,000</span>
                      <span className="text-[10px] uppercase block font-mono text-white/60">/ month</span>
                    </div>
                  </div>
                  <p className="text-xs font-sans text-white/90 leading-relaxed font-light">
                    Ultimate performance cluster featuring priority quantum loops, fiber-optic physical ports mapped dynamically, and specific custom sentiment bias weights.
                  </p>
                  <ul className="space-y-2.5 pt-2 text-[10px] font-mono text-zinc-300">
                    <li className="flex items-center gap-2">★ Full bare-metal dedicated proxy server</li>
                    <li className="flex items-center gap-2">★ Direct fiber to Tokyo, London & Chicago books</li>
                    <li className="flex items-center gap-2">★ Sub-millisecond guaranteed execution paths</li>
                  </ul>
                </div>

                <button 
                  onClick={() => alert("Contact quantum desk: priority@supernova-osmo.ai")}
                  className="w-full py-4 rounded-2xl bg-[#bffe1c] text-[#0a0a0c] hover:bg-[#a9e217] transition-all font-mono font-black text-xs uppercase tracking-widest text-center cursor-pointer border-none"
                >
                  Secure Quantum License ↗
                </button>
              </div>

            </div>
          </section>

          {/* Section 6: Dennis Snellenberg inspired CTA (Ready to level up) */}
          <section className="py-24 px-6 max-w-5xl mx-auto">
            <div className="p-12 rounded-[52px] bg-[#5f5cf2] text-white grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden shadow-2xl">
              
              {/* Spinning star ornaments in background */}
              <div className="absolute top-[20%] left-[5%] text-[100px] text-white/5 font-serif select-none pointer-events-none">✦</div>
              
              <div className="md:col-span-8 space-y-4 z-10 relative text-left">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#bffe1c] inline-block animate-ping" />
                  <span className="text-[10px] font-mono tracking-widest text-[#bffe1c] uppercase font-bold">SOVEREIGN ALLIANCE NETWORK</span>
                </div>
                <h2 className="font-sans font-black text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight leading-[0.95] max-w-xl">
                  Take Command <br />
                  <span className="text-zinc-950 font-heading italic font-light">of the Feed.</span>
                </h2>
                <p className="text-white/80 font-sans font-light leading-relaxed max-w-md text-xs sm:text-sm">
                  Supercharge your trades with AI-classification. Join 2K+ operators secure inside our delta-neutral hedge loop networks today.
                </p>
              </div>

              <div className="md:col-span-4 flex justify-start md:justify-end z-10 relative">
                <button
                  onClick={() => alert("Priority setup initiated. Please consult priority@supernova-osmo.ai")}
                  className="w-full md:w-auto px-8 py-5 rounded-full bg-[#bffe1c] hover:bg-white text-[#0a0a0c] transition-all font-mono font-black text-xs uppercase tracking-widest cursor-pointer border-none shadow-lg shadow-black/35"
                >
                  Deploy Sovereign Engine ↗
                </button>
              </div>

            </div>
          </section>

          {/* Section: Beta Whitelist Early Access Gate */}
          <section className="py-20 px-6 max-w-5xl mx-auto border-t border-white/5 relative z-10 text-center">
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-1/3 w-64 h-32 bg-[#38bdf8]/10 blur-[90px] rounded-full pointer-events-none" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8] text-[10px] font-mono font-bold uppercase tracking-widest mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Restricted Quant Whitelist Gate</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-sans font-black text-white tracking-tight mb-3">
                Approved Access Only.
              </h2>
              <p className="text-zinc-400 font-sans text-xs sm:text-sm max-w-xl mx-auto mb-8 leading-relaxed">
                Direct algorithmic access to Supernova Macro Intelligence and Groq reasoning engines is restricted to institutional quant desks and verified portfolio operators.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter institutional work email..."
                  value={whitelistQuickEmail}
                  onChange={(e) => setWhitelistQuickEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/90 border border-white/10 rounded-full text-white font-mono text-xs focus:outline-none focus:border-[#38bdf8] placeholder:text-zinc-600"
                />
                <button
                  onClick={() => {
                    setAuthModalTab('whitelist');
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-[#38bdf8] hover:bg-[#2cb2ed] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-full shrink-0 transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] cursor-pointer"
                >
                  Request Invite
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Supabase GoTrue Enclave
                </span>
                <span>•</span>
                <button
                  onClick={() => {
                    setAuthModalTab('audit');
                    setIsAuthModalOpen(true);
                  }}
                  className="text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  View Security Audit Logs
                </button>
              </div>
            </div>
          </section>

          {/* Footer Copyright links */}
          <footer className="py-12 px-6 border-t border-white/5 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-600 font-mono text-[10px] uppercase">
            <div className="flex items-center gap-3">
              <span>© {new Date().getFullYear()} Supernova AI Trading Systems Ltd.</span>
              <span>•</span>
              <span className="text-zinc-500">Supabase Auth Integrated</span>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => {
                  setAuthModalTab('audit');
                  setIsAuthModalOpen(true);
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Audit Stream
              </button>
              <a href="#" className="hover:text-white transition-colors">Tactical integrity</a>
              <a href="#" className="hover:text-white transition-colors">Proxy licenses</a>
              <a href="#" className="hover:text-white transition-colors">SEC compliance</a>
            </div>
          </footer>

        </main>

      {/* Compiler Action Visualizer Overlay/Modal */}
      {showCompilerModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-[#050507]/90 backdrop-blur-md">
          <div className="relative w-full max-w-lg p-0.5 rounded-[32px] bg-gradient-to-b from-[#5f5cf2]/30 to-white/5">
            <div className="bg-[#0e0e12] p-6 rounded-[30px] space-y-4 border border-white/5">
              
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Orbit size={16} className={`${compiling ? "animate-spin text-[#bffe1c]" : "text-[#5f5cf2]"}`} />
                  <h4 className="font-heading text-2xl text-white italic font-normal tracking-wide">Supernova Compiler Output</h4>
                </div>
                {!compiling && (
                  <button
                    onClick={() => setShowCompilerModal(false)}
                    className="p-1 px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full font-mono text-[9px] uppercase hover:text-white cursor-pointer border-none"
                  >
                    Close
                  </button>
                )}
              </div>

              {/* Log output block */}
              <div className="p-4 bg-black/90 rounded-2xl max-h-[250px] overflow-y-auto font-mono text-[9px] text-[#f4f4f6]/80 space-y-1 select-all border border-white/5 scrollbar-thin">
                {compilerLogs.map((log, index) => (
                  <div key={index} className="flex gap-2 leading-relaxed">
                    <span className="text-white/20 select-none">[{index + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))}
                {compiling && (
                  <div className="flex gap-2 text-[#bffe1c] animate-pulse font-bold select-none">
                    <span>[_]</span>
                    <span>Establishing compilation threads ...</span>
                  </div>
                )}
              </div>

              {/* Status indicator */}
              <div className="text-center pt-1">
                {compiling ? (
                  <span className="text-[10px] text-zinc-500 font-sans animate-pulse block">
                    Distributing Assembly gate arrays to Tokyo, Frankfurt, London...
                  </span>
                ) : (
                  <div className="space-y-3">
                    <span className="text-[10px] text-[#bffe1c] font-mono block font-bold uppercase tracking-wider">
                      ✓ PIPELINE SYNCHRONIZED SUCCESSFULLY WITH 0.85ms COMPILATION OVERHEAD
                    </span>
                    <button
                      onClick={() => setShowCompilerModal(false)}
                      className="w-full py-4 text-[10px] font-mono font-black tracking-widest text-[#0a0a0c] bg-[#bffe1c] hover:bg-white uppercase transition-all rounded-full cursor-pointer border-none shadow"
                    >
                      Armed & Secure
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Signal Telemetry Detail Interactive modal */}
      <SignalDetailModal
        signal={selectedSignal}
        onClose={() => setSelectedSignal(null)}
      />

      {/* Dark Glassmorphic Auth & Whitelist Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          const target = location.state?.from?.pathname || '/macro-intel';
          navigate(target);
        }}
      />

    </div>
  );
}
