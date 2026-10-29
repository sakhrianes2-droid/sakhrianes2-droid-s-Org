import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import {
  RSS_FEEDS,
  FALLBACK_BIASES,
  DEFAULT_CALENDAR_EVENTS,
  DEFAULT_CENTRAL_BANKS,
  DailyMarketBias,
  EconomicEvent,
  MacroAlertRule,
  CentralBankPolicy,
  GlobalMacroIndex,
  fallbackNlpParser,
  generateEconomicSeries,
  computeSeriesChange,
  calculateDeviation,
  parseNumericValue,
} from './src/server/macroService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory state initialized with institutional baseline data
const todayStr = () => new Date().toISOString().split('T')[0];

const biasCache: DailyMarketBias[] = Object.entries(FALLBACK_BIASES).map(([asset_class, data]) => ({
  date: todayStr(),
  asset_class,
  ...data,
  updated_at: new Date().toISOString(),
}));

let calendarCache: EconomicEvent[] = DEFAULT_CALENDAR_EVENTS.map((e) => ({ ...e }));

let alertsCache: MacroAlertRule[] = [
  {
    id: 101,
    event_name: 'Core CPI (MoM)',
    condition_op: '>',
    benchmark: 'estimate',
    variance: 0.1,
    created_at: new Date().toISOString(),
  },
];

const centralBanksCache: Record<string, CentralBankPolicy> = {
  ...DEFAULT_CENTRAL_BANKS,
};

let globalIndexCache: GlobalMacroIndex = {
  date: todayStr(),
  score: 62,
  label: 'Mild Greed',
  summary:
    'Resilient macroeconomic labor data and sustained institutional risk liquidity support broad market stability.',
};

const pipelineStore = new Map<string, { nodes: unknown[]; edges: unknown[]; updated_at: string }>();

const priceState: Record<string, { price: number; change: number; history: number[] }> = {
  'BTC/USD': {
    price: 68421.5,
    change: 4.82,
    history: [67800, 68100, 67950, 68250, 68050, 68350, 68421.5],
  },
  'GC1! (GOLD)': {
    price: 2342.1,
    change: 1.15,
    history: [2325, 2330, 2328, 2335, 2332, 2339, 2342.1],
  },
  'CL1! (OIL)': {
    price: 78.45,
    change: -2.31,
    history: [80.1, 79.8, 79.2, 78.9, 78.6, 78.3, 78.45],
  },
  'GBP/USD': {
    price: 1.2724,
    change: 0.42,
    history: [1.268, 1.271, 1.2695, 1.2715, 1.2708, 1.2721, 1.2724],
  },
};

let nextSyncTime = Date.now() + 60_000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // WebSocket hub supporting both /ws/bias and /ws/terminal on port 3000
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  const broadcast = (payload: Record<string, unknown>) => {
    const msg = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  };

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/ws/bias' || pathname === '/ws/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        clients.add(ws);
        if (pathname === '/ws/terminal') {
          ws.send(
            JSON.stringify({
              type: 'status',
              content: 'Connected to Live Trading Engine',
              timestamp: new Date().toISOString(),
            })
          );
          ws.send(
            JSON.stringify({
              type: 'log',
              content:
                'SIGNAL: BTC/USD | Direction: BUY | Entry: 68421.50 | SL: 67750.00 | TP: 70200.00 | Reason: Sovereign collateral rotation & spot ETF inflow acceleration',
              timestamp: new Date().toISOString(),
            })
          );
        }
        ws.on('close', () => {
          clients.delete(ws);
        });
        ws.on('error', () => {
          clients.delete(ws);
        });
      });
    }
  });

  // Periodic background calendar release & terminal signal simulation
  setInterval(() => {
    nextSyncTime = Date.now() + 60_000;
    const pending = calendarCache.filter((e) => e.status === 'PENDING');
    if (pending.length === 0) {
      calendarCache = calendarCache.map((e) =>
        e.id >= 5
          ? {
              ...e,
              status: 'PENDING',
              actual: null,
              sentiment: null,
              deviation: 0,
              surprise_factor: 0,
              released_at: null,
            }
          : e
      );
      broadcast({ type: 'macro_reset', timestamp: new Date().toISOString() });
      return;
    }

    const target = pending[0];
    const { numericVal: consVal, unit } = parseNumericValue(target.consensus || '1.0%');
    const baseVal = consVal ?? 1.0;
    const deltas = [-0.2, -0.1, 0.1, 0.2];
    const delta = deltas[Math.floor(Math.random() * deltas.length)];
    const actVal = Number((baseVal + delta).toFixed(2));
    const actualStr = unit === '%' ? `${actVal}%` : unit === 'K' ? `${Math.round(actVal)}K` : `${actVal}`;
    const { deviation, sentiment } = calculateDeviation(actualStr, target.consensus);

    target.actual = actualStr;
    target.status = 'RELEASED';
    target.released_at = new Date().toTimeString().split(' ')[0];
    target.deviation = deviation;
    target.surprise_factor = deviation;
    target.sentiment = sentiment;

    broadcast({
      type: 'macro_release',
      event: target,
      triggered_alerts: [],
      timestamp: new Date().toISOString(),
    });
  }, 25_000);

  // Health endpoints
  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({
      status: 'online',
      service: 'Macroeconomic Intelligence Platform (Macro Intel)',
      port: PORT,
      version: '2.0.0',
    });
  });

  // Macro Bias routes
  app.get('/api/macro/bias', (_req, res) => {
    const secondsLeft = Math.max(1, Math.floor((nextSyncTime - Date.now()) / 1000));
    res.json({
      status: 'success',
      biases: biasCache,
      next_sync_in_seconds: secondsLeft,
    });
  });

  app.get('/api/macro/feeds', (_req, res) => {
    const feeds = RSS_FEEDS.map((f) => ({
      id: f.id,
      name: f.name,
      url: f.domain,
      latency: Number((0.45 + Math.random() * 0.4).toFixed(2)),
      throughput: `${Math.floor(70 + Math.random() * 65)} KB/s`,
      status: 'ONLINE',
      category: f.category,
    }));
    res.json({ status: 'success', feeds });
  });

  app.post('/api/macro/generate_bias', (req, res) => {
    const assetClass = String(req.query.asset_class || req.body?.asset_class || 'USD');
    const existing =
      biasCache.find((b) => b.asset_class.toLowerCase() === assetClass.toLowerCase()) || biasCache[0];
    const updated: DailyMarketBias = {
      ...existing,
      date: todayStr(),
      updated_at: new Date().toISOString(),
    };
    broadcast({
      type: 'bias_update',
      data: updated,
      timestamp: new Date().toISOString(),
      is_cached: false,
    });
    res.json({ status: 'success', data: updated });
  });

  // Global Macro Sentiment Index
  app.get('/api/macro/global_index', (_req, res) => {
    res.json({
      status: 'success',
      global_index: {
        ...globalIndexCache,
        date: todayStr(),
      },
    });
  });

  // Central Bank Policy & NLP Speech Analyzer
  app.get('/api/macro/policy', (_req, res) => {
    res.json({ policy: centralBanksCache });
  });

  app.post('/api/macro/policy/analyze', (req, res) => {
    const { bank = 'FED', speaker = 'Jerome Powell', speech_text = '' } = req.body || {};
    const parsed = fallbackNlpParser(String(speech_text));
    res.json({
      bank,
      speaker,
      ...parsed,
    });
  });

  // Economic Calendar & Alerts
  app.get(['/api/macro/calendar', '/api/calendar'], (_req, res) => {
    res.json({
      status: 'success',
      calendar: calendarCache,
      data: calendarCache,
    });
  });

  app.get(['/api/macro/alerts', '/api/calendar/alerts'], (_req, res) => {
    res.json({ alerts: alertsCache });
  });

  app.post(['/api/macro/alerts', '/api/calendar/alerts'], (req, res) => {
    const { event_name, condition_op, benchmark, variance } = req.body || {};
    if (!event_name || !condition_op || !benchmark) {
      res.status(400).json({ detail: 'Missing required alert parameters' });
      return;
    }
    const newAlert: MacroAlertRule = {
      id: Date.now(),
      event_name: String(event_name),
      condition_op: String(condition_op),
      benchmark: String(benchmark),
      variance: Number(variance ?? 0.1),
      created_at: new Date().toISOString(),
    };
    alertsCache = [newAlert, ...alertsCache];
    res.json({
      status: 'success',
      message: 'Macro deviation alert rule created successfully.',
      id: newAlert.id,
      alert: newAlert,
    });
  });

  app.delete(['/api/macro/alerts/:alertId', '/api/calendar/alerts/:alertId'], (req, res) => {
    const id = Number(req.params.alertId);
    alertsCache = alertsCache.filter((a) => a.id !== id);
    res.json({ status: 'success', message: `Macro alert rule ${id} deleted.` });
  });

  // Economic Indicators (CPI, PPI, NFP, GDP, Retail Sales, Summary)
  const buildCpi = () => {
    const series = generateEconomicSeries(314.5, 0.003);
    const latest = series[series.length - 1];
    return {
      indicator: 'CPI',
      full_name: 'Consumer Price Index',
      description: 'Measures the average change in prices paid by consumers for goods and services.',
      latest_value: latest.value,
      latest_date: latest.date,
      yoy_change: computeSeriesChange(series, 12) || 3.2,
      mom_change: computeSeriesChange(series, 1) || 0.3,
      trend: 'up',
      impact: 'Higher CPI signals rising inflation, prompting restrictive Fed policy stance.',
      series,
      source: 'U.S. Bureau of Labor Statistics',
      live: true,
    };
  };

  const buildPpi = () => {
    const series = generateEconomicSeries(254.2, 0.005);
    const latest = series[series.length - 1];
    return {
      indicator: 'PPI',
      full_name: 'Producer Price Index',
      description:
        'Measures the average change in selling prices received by domestic producers for their output.',
      latest_value: latest.value,
      latest_date: latest.date,
      yoy_change: computeSeriesChange(series, 12) || 2.4,
      mom_change: computeSeriesChange(series, 1) || 0.2,
      trend: 'up',
      impact: 'Rising PPI often leads CPI higher, signalling upstream inflationary pressure.',
      series,
      source: 'U.S. Bureau of Labor Statistics',
      live: true,
    };
  };

  const buildNfp = () => {
    const series = generateEconomicSeries(158200.0, 0.002);
    const latest = series[series.length - 1];
    return {
      indicator: 'NFP',
      full_name: 'Non-Farm Payrolls',
      description: 'Total number of paid U.S. workers excluding farm and government jobs.',
      latest_value: latest.value,
      latest_date: latest.date,
      monthly_change: 185000,
      mom_change: 0.12,
      yoy_change: 1.8,
      trend: 'up',
      impact: 'Strong NFP = robust labor market → hawkish Fed expectations → USD strength.',
      series,
      source: 'U.S. Bureau of Labor Statistics',
      live: true,
    };
  };

  const buildGdp = () => {
    const series = generateEconomicSeries(28200.0, 0.006, 8);
    const latest = series[series.length - 1];
    return {
      indicator: 'GDP',
      full_name: 'Gross Domestic Product',
      description: 'Monetary value of all finished goods and services produced domestically.',
      latest_value: latest.value,
      latest_date: latest.date,
      quarterly_growth: 2.1,
      quarterly_change: 0.5,
      yoy_change: 2.8,
      trend: 'up',
      impact: 'GDP growth above expectations is bullish for equities; contraction raises recession risks.',
      series,
      source: 'U.S. Bureau of Economic Analysis',
      live: true,
    };
  };

  const buildRetail = () => {
    const rsSeries = generateEconomicSeries(705000.0, 0.008);
    const ccSeries = generateEconomicSeries(78.5, 0.02);
    const rsLatest = rsSeries[rsSeries.length - 1];
    const ccLatest = ccSeries[ccSeries.length - 1];
    return {
      indicator: 'RETAIL',
      full_name: 'Retail Sales & Consumer Confidence',
      description: 'Receipts of retail stores and consumer confidence metrics.',
      retail_sales: {
        latest_value: rsLatest.value,
        latest_date: rsLatest.date,
        mom_change: 0.4,
        yoy_change: 3.1,
        series: rsSeries,
      },
      consumer_confidence: {
        latest_value: ccLatest.value,
        latest_date: ccLatest.date,
        mom_change: 1.2,
        yoy_change: 4.5,
        series: ccSeries,
      },
      trend: 'up',
      impact: 'Strong retail sales support risk-on market conditions and corporate earnings.',
      source: 'U.S. Census Bureau',
      live: true,
    };
  };

  app.get('/api/economic/cpi', (_req, res) => res.json(buildCpi()));
  app.get('/api/economic/ppi', (_req, res) => res.json(buildPpi()));
  app.get('/api/economic/nfp', (_req, res) => res.json(buildNfp()));
  app.get('/api/economic/gdp', (_req, res) => res.json(buildGdp()));
  app.get('/api/economic/retail-sales', (_req, res) => res.json(buildRetail()));
  app.get('/api/economic/summary', (_req, res) => {
    const cpi = buildCpi();
    const ppi = buildPpi();
    const nfp = buildNfp();
    const gdp = buildGdp();
    const retail = buildRetail();
    res.json({
      indicators: {
        CPI: cpi,
        PPI: ppi,
        NFP: nfp,
        GDP: gdp,
        RETAIL: retail,
        cpi,
        ppi,
        nfp,
        gdp,
        retail_sales: retail,
      },
      generated_at: new Date().toISOString(),
    });
  });

  // Pipeline synchronization endpoints
  app.get('/api/pipeline', (_req, res) => {
    const existing = pipelineStore.get('default_user') || { nodes: [], edges: [] };
    res.json({ nodes: existing.nodes, edges: existing.edges });
  });

  app.put('/api/pipeline/sync', (req, res) => {
    const { nodes = [], edges = [] } = req.body || {};
    const now = new Date().toISOString();
    pipelineStore.set('default_user', { nodes, edges, updated_at: now });
    res.json({ status: 'ACK', timestamp: now });
  });

  app.post('/api/pipeline/sync', (req, res) => {
    const { nodes = [], edges = [] } = req.body || {};
    const now = new Date().toISOString();
    pipelineStore.set('default_user', { nodes, edges, updated_at: now });
    res.json({ status: 'ACK', timestamp: now });
  });

  // Pipeline feeds & prices
  app.get('/api/feeds', (_req, res) => {
    res.json({
      feeds: [
        {
          id: 'bloomberg',
          name: 'Bloomberg Terminal',
          url: 'bloomberg.com/news/rss',
          latency: 0.85,
          throughput: '120 KB/s',
          status: 'ONLINE',
          category: 'Macro',
        },
        {
          id: 'cnbc',
          name: 'CNBC International',
          url: 'cnbc.com/id/100003114/device/rss',
          latency: 1.15,
          throughput: '82 KB/s',
          status: 'ONLINE',
          category: 'Macro',
        },
        {
          id: 'forexlive',
          name: 'ForexLive High-Beta',
          url: 'forexlive.com/feed',
          latency: 0.95,
          throughput: '58 KB/s',
          status: 'ONLINE',
          category: 'Macro',
        },
        {
          id: 'wsj',
          name: 'Wall Street Journal Markets',
          url: 'feeds.a.dj.com/rss/RSSMarketsMain.xml',
          latency: 0.9,
          throughput: '110 KB/s',
          status: 'ONLINE',
          category: 'Macro',
        },
      ],
    });
  });

  app.get('/api/prices', (_req, res) => {
    const assetsData = Object.entries(priceState).map(([symbol, data]) => {
      const percentWalk = (Math.random() - 0.49) * 0.1;
      const absChange = data.price * (percentWalk / 100);
      const dec = symbol === 'GBP/USD' ? 4 : 2;
      const newPrice = Number((data.price + absChange).toFixed(dec));
      const newChange = Number((data.change + percentWalk).toFixed(2));
      const newHistory = [...data.history.slice(1), newPrice];
      priceState[symbol] = { price: newPrice, change: newChange, history: newHistory };
      const spread = symbol === 'GBP/USD' ? 0.0002 : Number((newPrice * 0.0003).toFixed(2));
      return {
        symbol,
        price: newPrice,
        change: newChange,
        volume: `${Math.floor(15 + Math.random() * 30)}K`,
        spread,
        status: 'ACTIVE',
        history: newHistory,
      };
    });
    res.json({ assets: assetsData });
  });

  // Telemetry & Command Center endpoints
  app.post('/api/log', (req, res) => {
    const text = req.body?.text || '';
    if (text) {
      broadcast({
        type: 'log',
        content: text,
        timestamp: new Date().toISOString(),
      });
    }
    res.json({ status: 'success' });
  });

  app.post('/api/command/stop', (_req, res) => {
    const msg = 'EMERGENCY STOP EXECUTED — Autonomous execution halted.';
    broadcast({ type: 'log', content: msg, timestamp: new Date().toISOString() });
    res.json({ status: 'success', message: msg });
  });

  app.post('/api/command/start', (_req, res) => {
    const msg = 'SYSTEM RESUMED — Autonomous neural execution re-armed.';
    broadcast({ type: 'log', content: msg, timestamp: new Date().toISOString() });
    res.json({ status: 'success', message: msg });
  });

  app.post('/api/command/close', (req, res) => {
    const sigId = req.body?.signal_id || 'ALL';
    const msg = `SIGNAL CLOSED: BTC/USD (ID: ${sigId}) | Final P&L: +1.85%`;
    broadcast({ type: 'log', content: msg, timestamp: new Date().toISOString() });
    res.json({ status: 'success', message: `Closed signal ${sigId}` });
  });

  app.put('/api/command/risk', (req, res) => {
    const { asset = 'BTC', sl_pct = 0.01, tp_pct = 0.02 } = req.body || {};
    const msg = `RISK UPDATED: ${asset} | SL: ${sl_pct} | TP: ${tp_pct}`;
    broadcast({ type: 'log', content: msg, timestamp: new Date().toISOString() });
    res.json({ status: 'success', message: msg });
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Supernova AI Trading System server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
