export type MarketBias = 'Bullish' | 'Bearish' | 'Neutral';

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  description?: string;
  published_at?: string;
}

export interface DailyMarketBias {
  date: string;
  asset_class: string;
  bias: MarketBias;
  confidence_score: number;
  key_drivers: string[];
  ai_summary: string;
  latest_news: NewsItem[];
  updated_at?: string;
}

export interface EconomicEvent {
  id: number;
  time: string;
  country: string;
  event: string;
  previous: string | null;
  consensus: string | null;
  estimate: string | null;
  actual: string | null;
  status: 'RELEASED' | 'PENDING';
  impact: string;
  released_at: string | null;
  sentiment: 'bullish' | 'bearish' | 'neutral' | null;
  deviation: number;
  surprise_factor: number;
}

export interface MacroAlertRule {
  id: number;
  user_id?: string;
  event_name: string;
  condition_op: string;
  benchmark: string;
  variance: number;
  created_at: string;
}

export interface CentralBankPolicy {
  bank: string;
  rate: string;
  previous_rate: string;
  delta_bps: number;
  sentiment_score: number;
  sentiment_label: string;
  guidance: string;
  speaker: string;
  last_update: string;
}

export interface GlobalMacroIndex {
  date: string;
  score: number;
  label: string;
  summary: string;
}

export const RSS_FEEDS = [
  {
    id: 'forexlive',
    name: 'ForexLive News',
    url: 'https://www.forexlive.com/feed',
    domain: 'forexlive.com',
    category: 'Macro',
  },
  {
    id: 'cnbc',
    name: 'CNBC Global Markets',
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',
    domain: 'cnbc.com',
    category: 'General',
  },
  {
    id: 'wsj',
    name: 'Wall Street Journal Markets',
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    domain: 'wsj.com',
    category: 'Macro',
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch Top Stories',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    domain: 'marketwatch.com',
    category: 'Macro',
  },
  {
    id: 'investing',
    name: 'Investing.com News',
    url: 'https://www.investing.com/rss/news_25.rss',
    domain: 'investing.com',
    category: 'Research',
  },
];

export const FALLBACK_BIASES: Record<string, Omit<DailyMarketBias, 'date' | 'asset_class'>> = {
  USD: {
    bias: 'Bullish',
    confidence_score: 85,
    key_drivers: ['Hawkish Fed Stance', 'Treasury Yield Strength'],
    ai_summary:
      "The Federal Reserve's restrictive policy stance alongside resilient US economic prints continues to drive sustained institutional demand for the US Dollar.",
    latest_news: [
      {
        source: 'bloomberg.com',
        title: 'Dollar index maintains multi-month highs on persistent yield premium',
        link: 'https://bloomberg.com',
      },
      {
        source: 'forexlive.com',
        title: 'Fed speakers reiterate commitment to quantitative tightening targets',
        link: 'https://forexlive.com',
      },
    ],
  },
  'EUR/USD': {
    bias: 'Bearish',
    confidence_score: 78,
    key_drivers: ['ECB Rate Pivot', 'Eurozone Growth Headwinds'],
    ai_summary:
      'Monetary policy divergence between the Federal Reserve and the European Central Bank exerts sustained downward pressure on the Euro.',
    latest_news: [
      {
        source: 'wsj.com',
        title: 'ECB officials signal measured easing pace amidst weak industrial output',
        link: 'https://wsj.com',
      },
      {
        source: 'reuters.com',
        title: 'Eurozone private sector activity registers modest contraction',
        link: 'https://reuters.com',
      },
    ],
  },
  Gold: {
    bias: 'Bullish',
    confidence_score: 82,
    key_drivers: ['Safe-Haven Asset Inflows', 'Central Bank Purchases'],
    ai_summary:
      'Persistent geopolitical frictions and sovereign central bank bullion diversification provide a firm floor under precious metals.',
    latest_news: [
      {
        source: 'cnbc.com',
        title: 'Gold extends structural consolidation near historic highs on reserve demand',
        link: 'https://cnbc.com',
      },
      {
        source: 'marketwatch.com',
        title: 'Central bank bullion reserves continue steady quarterly expansion',
        link: 'https://marketwatch.com',
      },
    ],
  },
  'S&P 500': {
    bias: 'Bearish',
    confidence_score: 72,
    key_drivers: ['Elevated Discount Rates', 'Multiple Compression Pressure'],
    ai_summary:
      'Long-term risk-free bond yields are compressing equity valuation multiples across technology and growth market leaders.',
    latest_news: [
      {
        source: 'cnbc.com',
        title: '10-Year Treasury yield volatility dampens broad equity risk appetite',
        link: 'https://cnbc.com',
      },
      {
        source: 'wsj.com',
        title: 'Fund managers rotate into defensive value and cash equivalents',
        link: 'https://wsj.com',
      },
    ],
  },
  'Crude Oil': {
    bias: 'Neutral',
    confidence_score: 60,
    key_drivers: ['OPEC+ Production Discipline', 'Uneven Global Demand'],
    ai_summary:
      'Strict supply curtailments by producer nations balance out macroeconomic demand concerns, keeping energy prices rangebound.',
    latest_news: [
      {
        source: 'reuters.com',
        title: 'OPEC+ signals continuity in voluntary production restraint',
        link: 'https://reuters.com',
      },
      {
        source: 'bloomberg.com',
        title: 'Commercial crude inventories oscillate within five-year averages',
        link: 'https://bloomberg.com',
      },
    ],
  },
  Bitcoin: {
    bias: 'Bullish',
    confidence_score: 80,
    key_drivers: ['Institutional ETF Inflows', 'Constrained Liquid Supply'],
    ai_summary:
      'Steady institutional spot allocations alongside structural post-halving liquid supply restrictions support sustained directional upside.',
    latest_news: [
      {
        source: 'coindesk.com',
        title: 'Spot digital asset products log consecutive positive weekly flows',
        link: 'https://coindesk.com',
      },
      {
        source: 'cnbc.com',
        title: 'Exchange reserve liquidity drops as long-term holdings accumulate',
        link: 'https://cnbc.com',
      },
    ],
  },
};

export const DEFAULT_CALENDAR_EVENTS: EconomicEvent[] = [
  {
    id: 1,
    time: '08:30',
    country: 'US',
    event: 'Core CPI (MoM)',
    previous: '0.2%',
    consensus: '0.3%',
    estimate: '0.3%',
    actual: '0.4%',
    status: 'RELEASED',
    impact: 'High',
    released_at: 'today',
    sentiment: 'bullish',
    deviation: 0.1,
    surprise_factor: 0.1,
  },
  {
    id: 2,
    time: '08:30',
    country: 'US',
    event: 'CPI (YoY)',
    previous: '3.3%',
    consensus: '3.4%',
    estimate: '3.4%',
    actual: '3.5%',
    status: 'RELEASED',
    impact: 'High',
    released_at: 'today',
    sentiment: 'bullish',
    deviation: 0.1,
    surprise_factor: 0.1,
  },
  {
    id: 3,
    time: '08:30',
    country: 'US',
    event: 'Core PPI (MoM)',
    previous: '0.2%',
    consensus: '0.2%',
    estimate: '0.2%',
    actual: '0.3%',
    status: 'RELEASED',
    impact: 'High',
    released_at: 'today',
    sentiment: 'bullish',
    deviation: 0.1,
    surprise_factor: 0.1,
  },
  {
    id: 4,
    time: '14:15',
    country: 'EU',
    event: 'ECB Interest Rate Decision',
    previous: '4.25%',
    consensus: '4.00%',
    estimate: '4.00%',
    actual: '4.00%',
    status: 'RELEASED',
    impact: 'High',
    released_at: 'today',
    sentiment: 'neutral',
    deviation: 0.0,
    surprise_factor: 0.0,
  },
  {
    id: 5,
    time: '08:30',
    country: 'US',
    event: 'Non-Farm Employment Change (NFP)',
    previous: '175K',
    consensus: '185K',
    estimate: '185K',
    actual: null,
    status: 'PENDING',
    impact: 'High',
    released_at: null,
    sentiment: null,
    deviation: 0.0,
    surprise_factor: 0.0,
  },
  {
    id: 6,
    time: '08:30',
    country: 'US',
    event: 'Unemployment Rate',
    previous: '3.9%',
    consensus: '3.9%',
    estimate: '3.9%',
    actual: null,
    status: 'PENDING',
    impact: 'High',
    released_at: null,
    sentiment: null,
    deviation: 0.0,
    surprise_factor: 0.0,
  },
  {
    id: 7,
    time: '08:30',
    country: 'US',
    event: 'GDP (QoQ) (Q2)',
    previous: '1.3%',
    consensus: '1.8%',
    estimate: '1.8%',
    actual: null,
    status: 'PENDING',
    impact: 'High',
    released_at: null,
    sentiment: null,
    deviation: 0.0,
    surprise_factor: 0.0,
  },
  {
    id: 8,
    time: '08:30',
    country: 'US',
    event: 'Retail Sales (MoM)',
    previous: '0.1%',
    consensus: '0.2%',
    estimate: '0.2%',
    actual: null,
    status: 'PENDING',
    impact: 'Medium',
    released_at: null,
    sentiment: null,
    deviation: 0.0,
    surprise_factor: 0.0,
  },
  {
    id: 9,
    time: '09:45',
    country: 'UK',
    event: 'Services PMI',
    previous: '52.9',
    consensus: '53.0',
    estimate: '53.0',
    actual: null,
    status: 'PENDING',
    impact: 'Medium',
    released_at: null,
    sentiment: null,
    deviation: 0.0,
    surprise_factor: 0.0,
  },
];

export const DEFAULT_CENTRAL_BANKS: Record<string, CentralBankPolicy> = {
  FED: {
    bank: 'Federal Reserve (Fed)',
    rate: '5.25%',
    previous_rate: '5.50%',
    delta_bps: -25,
    sentiment_score: 0.45,
    sentiment_label: 'Mildly Hawkish',
    guidance:
      'Inflation remains elevated above long-term objectives. Further quantitative tightening remains data-dependent and measured.',
    speaker: 'Jerome Powell',
    last_update: 'today',
  },
  ECB: {
    bank: 'European Central Bank (ECB)',
    rate: '3.75%',
    previous_rate: '4.00%',
    delta_bps: -25,
    sentiment_score: -0.3,
    sentiment_label: 'Mildly Dovish',
    guidance:
      'Economic recovery is slow, refinancing pressure is easing. Rates may decline if disinflation trajectory stays on path.',
    speaker: 'Christine Lagarde',
    last_update: 'today',
  },
  BOE: {
    bank: 'Bank of England (BoE)',
    rate: '5.00%',
    previous_rate: '5.25%',
    delta_bps: -25,
    sentiment_score: 0.05,
    sentiment_label: 'Neutral / Balanced',
    guidance:
      'Services inflation and wage growth remain sticky. Restrictive monetary policy must remain in place for the foreseeable future.',
    speaker: 'Andrew Bailey',
    last_update: 'today',
  },
  BOJ: {
    bank: 'Bank of Japan (BoJ)',
    rate: '0.25%',
    previous_rate: '0.10%',
    delta_bps: 15,
    sentiment_score: 0.35,
    sentiment_label: 'Hawkish Normalization',
    guidance:
      'Underlying inflation trend is rising steadily. The central bank will continue to adjust policy rates if economic projections hold.',
    speaker: 'Kazuo Ueda',
    last_update: 'today',
  },
};

export function parseNumericValue(valStr: string | null | undefined): {
  numericVal: number | null;
  unit: string;
} {
  if (valStr === null || valStr === undefined) {
    return { numericVal: null, unit: '' };
  }
  const clean = String(valStr).trim();
  const match = clean.match(/[-+]?\d*\.?\d+/);
  if (!match) {
    return { numericVal: null, unit: '' };
  }
  const numericVal = parseFloat(match[0]);
  const unit = clean.includes('%') ? '%' : clean.toLowerCase().includes('k') ? 'K' : '';
  return { numericVal: Number.isNaN(numericVal) ? null : numericVal, unit };
}

export function calculateDeviation(
  actualStr: string | null | undefined,
  consensusStr: string | null | undefined
): { deviation: number; sentiment: 'bullish' | 'bearish' | 'neutral' } {
  const { numericVal: actualNum } = parseNumericValue(actualStr);
  const { numericVal: consensusNum } = parseNumericValue(consensusStr);

  if (actualNum === null || consensusNum === null) {
    return { deviation: 0.0, sentiment: 'neutral' };
  }

  const deviation = Number((actualNum - consensusNum).toFixed(2));
  const sentiment = deviation > 0 ? 'bullish' : deviation < 0 ? 'bearish' : 'neutral';
  return { deviation, sentiment };
}

export function calculateDeltaBps(currentRateStr: string, previousRateStr: string): number {
  const cur = parseFloat(currentRateStr.replace('%', '').trim());
  const prev = parseFloat(previousRateStr.replace('%', '').trim());
  if (Number.isNaN(cur) || Number.isNaN(prev)) return 0;
  return Math.round((cur - prev) * 100);
}

export function scoreSentimentLabel(score: number): string {
  if (score >= 0.6) return 'Strongly Hawkish';
  if (score >= 0.2) return 'Mildly Hawkish';
  if (score <= -0.6) return 'Strongly Dovish';
  if (score <= -0.2) return 'Mildly Dovish';
  return 'Neutral / Balanced';
}

export function fallbackNlpParser(text: string) {
  const textLower = text.toLowerCase();
  const hawkishKeywords = [
    'inflation',
    'tightening',
    'elevated',
    'restrictive',
    'rate hike',
    'upside risk',
    'overheating',
    'wage pressure',
    'higher for longer',
    'persistence',
  ];
  const dovishKeywords = [
    'easing',
    'rate cut',
    'slowdown',
    'weakness',
    'disinflation',
    'headwinds',
    'downside risk',
    'cooling',
    'slack',
    'stimulus',
    'accommodative',
  ];

  const hawkMatches = hawkishKeywords.filter((w) => textLower.includes(w));
  const doveMatches = dovishKeywords.filter((w) => textLower.includes(w));

  const hCount = hawkMatches.length;
  const dCount = doveMatches.length;
  const total = hCount + dCount;

  const rawScore = total === 0 ? 0.0 : Number(((hCount - dCount) / total).toFixed(2));
  const score = Math.max(-1.0, Math.min(1.0, rawScore));
  const label = scoreSentimentLabel(score);

  return {
    sentiment_score: score,
    sentiment_label: label,
    forward_guidance_shift:
      Math.abs(score) < 0.3
        ? 'Neutral data-dependence with gradual policy responsiveness.'
        : score > 0
        ? 'Hawk shift detected: higher emphasis on price stability.'
        : 'Dove shift detected: increased concern regarding growth and employment.',
    key_hawkish_phrases: hawkMatches.slice(0, 5),
    key_dovish_phrases: doveMatches.slice(0, 5),
    analysis_summary: `Qualitative lexicon analysis parsed ${hCount} hawkish markers and ${dCount} dovish markers, resulting in a continuous score of ${
      score >= 0 ? '+' : ''
    }${score.toFixed(2)}.`,
  };
}

export function calculateRegimeLabel(score: number): string {
  if (score >= 80) return 'Extreme Greed';
  if (score >= 60) return 'Mild Greed';
  if (score <= 20) return 'Extreme Fear';
  if (score <= 40) return 'Bearish';
  return 'Neutral';
}

export function generateEconomicSeries(
  base: number,
  volatility = 0.005,
  points = 12
): Array<{ date: string; value: number }> {
  const series: Array<{ date: string; value: number }> = [];
  let value = base;
  const now = new Date();
  for (let i = 0; i < points; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (points - 1 - i), 1);
    const delta = (Math.sin(i * 1.3 + base) * 0.6 + 0.15) * volatility;
    value += value * delta;
    series.push({
      date: d.toISOString().split('T')[0],
      value: Number(value.toFixed(2)),
    });
  }
  return series;
}

export function computeSeriesChange(
  series: Array<{ date: string; value: number }>,
  periods = 12
): number {
  if (!series || series.length < 2) return 0.0;
  const idx = Math.max(0, series.length - 1 - periods);
  const oldVal = series[idx].value;
  const newVal = series[series.length - 1].value;
  if (oldVal === 0) return 0.0;
  return Number((((newVal - oldVal) / Math.abs(oldVal)) * 100).toFixed(2));
}
