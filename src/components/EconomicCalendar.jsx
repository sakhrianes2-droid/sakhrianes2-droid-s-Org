import { useEffect, useState, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown, Clock, AlertCircle, Bell, Plus, Trash2, X, ShieldAlert } from 'lucide-react';
import { supabase, isSupabaseConfigured, authFetch, createAuthenticatedWebSocket } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const EconomicCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // User Deviation Alerts State
  const [alerts, setAlerts] = useState([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [isAlertSubmitting, setIsAlertSubmitting] = useState(false);
  const [alertFormError, setAlertFormError] = useState(null);

  // Form State
  const [alertEventName, setAlertEventName] = useState('Core CPI (MoM)');
  const [alertConditionOp, setAlertConditionOp] = useState('>');
  const [alertBenchmark, setAlertBenchmark] = useState('estimate');
  const [alertVariance, setAlertVariance] = useState('0.1');

  // Fetch Macro Calendar Events
  useEffect(() => {
    let active = true;
    const fetchCalendar = async () => {
      const endpoints = [
        '/api/macro/calendar',
        '/api/calendar'
      ];
      for (const url of endpoints) {
        try {
          const res = await authFetch(url, { signal: AbortSignal.timeout(1500) });
          if (res.ok) {
            const data = await res.json();
            const list = data.data || data.calendar;
            if (active && Array.isArray(list) && list.length > 0) {
              setEvents(list);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          // Continue to next fallback
        }
      }
      if (active) {
        setEvents([
          { id: 1, time: "08:30", country: "US", event: "Core CPI (MoM)", previous: "0.2%", estimate: "0.3%", actual: "0.4%", status: "RELEASED", impact: "High", sentiment: "bullish", surprise_factor: 0.1 },
          { id: 2, time: "08:30", country: "US", event: "CPI (YoY)", previous: "3.3%", estimate: "3.4%", actual: "3.5%", status: "RELEASED", impact: "High", sentiment: "bullish", surprise_factor: 0.1 },
          { id: 3, time: "14:15", country: "EU", event: "ECB Interest Rate Decision", previous: "4.25%", estimate: "4.00%", actual: "4.00%", status: "RELEASED", impact: "High", sentiment: "neutral", surprise_factor: 0 },
          { id: 4, time: "08:30", country: "US", event: "Non-Farm Employment Change (NFP)", previous: "175K", estimate: "185K", actual: null, status: "PENDING", impact: "High", sentiment: null, surprise_factor: 0 },
          { id: 5, time: "08:30", country: "US", event: "Unemployment Rate", previous: "3.9%", estimate: "3.9%", actual: null, status: "PENDING", impact: "High", sentiment: null, surprise_factor: 0 }
        ]);
        setLoading(false);
      }
    };
    fetchCalendar();

    let socket = null;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = createAuthenticatedWebSocket(`${wsProtocol}//${window.location.host}/ws/bias`);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'macro_release' && msg.event) {
            setEvents(prev => prev.map(e => e.id === msg.event.id ? msg.event : e));
          } else if (msg.type === 'macro_reset') {
            fetchCalendar();
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => {
      active = false;
      if (socket && socket.readyState === 1) {
        socket.close();
      }
    };
  }, []);

  // Fetch Alerts (Supabase Postgres or offline /api/calendar/alerts fallback)
  const fetchAlerts = useCallback(async () => {
    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('id', { ascending: false });

        if (!error && data) {
          setAlerts(data);
        }
      } catch (err) {
        console.warn('[Alerts] Supabase fetch error:', err);
      }
    } else {
      // Offline fallback: try /api/calendar/alerts then /api/macro/alerts
      for (const url of ['/api/calendar/alerts', '/api/macro/alerts']) {
        try {
          const res = await authFetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.alerts)) {
              setAlerts(data.alerts);
              return;
            }
          }
        } catch (e) {
          // Continue to next endpoint
        }
      }
    }
  }, [user]);

  // Initial alert loading & realtime subscription
  useEffect(() => {
    fetchAlerts();

    if (isSupabaseConfigured && user) {
      const channel = supabase
        .channel(`public:alerts:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
          () => {
            fetchAlerts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchAlerts]);

  // Insert Alert Rule
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setAlertFormError(null);

    const varianceNum = parseFloat(alertVariance);
    if (isNaN(varianceNum)) {
      setAlertFormError('Please enter a valid numeric variance threshold.');
      return;
    }

    setIsAlertSubmitting(true);

    if (isSupabaseConfigured && user) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .insert([
            {
              user_id: user.id,
              event_name: alertEventName.trim(),
              condition_op: alertConditionOp,
              benchmark: alertBenchmark,
              variance: varianceNum,
            }
          ])
          .select();

        if (error) {
          setAlertFormError(error.message);
        } else if (data && data.length > 0) {
          setAlerts(prev => [data[0], ...prev]);
          setShowAlertModal(false);
        }
      } catch (err) {
        setAlertFormError(err.message || 'Failed to save alert rule in Supabase.');
      }
    } else {
      // Offline / Local Enclave mode: persist via local backend API
      try {
        const res = await authFetch('/api/calendar/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_name: alertEventName.trim(),
            condition_op: alertConditionOp,
            benchmark: alertBenchmark,
            variance: varianceNum,
          })
        });

        if (res.ok) {
          await fetchAlerts();
          setShowAlertModal(false);
        } else {
          // If server unavailable, store locally
          const localId = Date.now();
          const newLocalAlert = {
            id: localId,
            event_name: alertEventName.trim(),
            condition_op: alertConditionOp,
            benchmark: alertBenchmark,
            variance: varianceNum,
            created_at: new Date().toISOString()
          };
          setAlerts(prev => [newLocalAlert, ...prev]);
          setShowAlertModal(false);
        }
      } catch {
        const localId = Date.now();
        const newLocalAlert = {
          id: localId,
          event_name: alertEventName.trim(),
          condition_op: alertConditionOp,
          benchmark: alertBenchmark,
          variance: varianceNum,
          created_at: new Date().toISOString()
        };
        setAlerts(prev => [newLocalAlert, ...prev]);
        setShowAlertModal(false);
      }
    }

    setIsAlertSubmitting(false);
  };

  // Delete Alert Rule
  const handleDeleteAlert = async (alertId) => {
    if (isSupabaseConfigured && user) {
      try {
        const { error } = await supabase
          .from('alerts')
          .delete()
          .eq('id', alertId)
          .eq('user_id', user.id);

        if (!error) {
          setAlerts(prev => prev.filter(a => a.id !== alertId));
        }
      } catch (err) {
        console.warn('[Alerts] Supabase delete error:', err);
      }
    } else {
      // Offline API delete
      try {
        await authFetch(`/api/calendar/alerts/${alertId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[Alerts] Local delete error:', err);
      }
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-zinc-950 border border-zinc-800 rounded-xl">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl shadow-2xl overflow-hidden text-white font-sans max-w-4xl w-full">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Macroeconomic Events</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-0.5">Live Finnhub Feed & Deviation Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 hover:border-indigo-500/60 rounded-full text-[10px] font-mono font-bold text-indigo-300 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Bell className="w-3 h-3 text-indigo-400" />
            <span>Configure Alert ({alerts.length})</span>
          </button>
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-full text-zinc-400">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      </div>

      {/* Active Alerts Bar (if any alerts configured) */}
      {alerts.length > 0 && (
        <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Alert Rules:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 border border-white/10 rounded-lg text-[10px] font-mono text-zinc-300"
              >
                <span className="font-bold text-white">{alert.event_name}</span>
                <span className="text-amber-400 font-bold">{alert.condition_op}</span>
                <span className="text-zinc-400">{alert.benchmark}</span>
                <span className="text-emerald-400 font-bold">±{alert.variance}</span>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="text-zinc-500 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                  title="Remove alert rule"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table / List */}
      <div className="divide-y divide-zinc-800/50">
        {events.map((evt) => (
          <div key={evt.id} className="p-4 hover:bg-zinc-900/30 transition-colors flex items-center gap-4 group">
            {/* Time & Country */}
            <div className="w-20 shrink-0 text-center border-r border-zinc-800/50 pr-4">
              <div className="flex items-center justify-center gap-1.5 mb-1 text-zinc-500">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-mono tracking-wider">{evt.time}</span>
              </div>
              <span className="text-xs font-black text-zinc-300 bg-zinc-800/50 px-2 py-0.5 rounded">{evt.country}</span>
            </div>

            {/* Event Name & Impact */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {evt.event}
                </h3>
                {evt.impact === 'High' && (
                  <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">
                    High Impact
                  </span>
                )}
                <button
                  onClick={() => {
                    setAlertEventName(evt.event);
                    setShowAlertModal(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 text-zinc-500 hover:text-amber-300 rounded transition-all cursor-pointer"
                  title="Create alert for this release"
                >
                  <Bell className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-6 text-[11px] font-mono shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-zinc-500 uppercase font-sans font-bold tracking-widest">Previous</span>
                <span className="text-zinc-400">{evt.previous ?? '---'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-zinc-500 uppercase font-sans font-bold tracking-widest">Forecast</span>
                <span className="text-blue-400">{evt.estimate ?? '---'}</span>
              </div>
              <div className="flex flex-col items-end w-16">
                <span className="text-[8px] text-zinc-500 uppercase font-sans font-bold tracking-widest">Actual</span>
                <span className={`font-bold ${evt.actual === null ? 'text-zinc-600' : 'text-white'}`}>
                  {evt.actual ?? 'WAITING'}
                </span>
              </div>

              {/* Surprise Factor */}
              <div className="w-24 flex justify-end">
                {evt.actual !== null ? (
                  <div className={`flex flex-col items-end border px-2 py-1 rounded-lg ${
                    evt.sentiment === 'bullish' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                    evt.sentiment === 'bearish' ? 'bg-rose-500/10 border-rose-500/20' : 
                    'bg-zinc-800 border-zinc-700'
                  }`}>
                    <span className="text-[7px] uppercase font-sans font-black tracking-widest text-zinc-400 mb-0.5">Surprise</span>
                    <div className={`flex items-center gap-1 ${
                      evt.sentiment === 'bullish' ? 'text-emerald-400' : 
                      evt.sentiment === 'bearish' ? 'text-rose-400' : 
                      'text-zinc-300'
                    }`}>
                      {evt.sentiment === 'bullish' && <TrendingUp className="w-3 h-3" />}
                      {evt.sentiment === 'bearish' && <TrendingDown className="w-3 h-3" />}
                      <span className="font-bold">{evt.surprise_factor > 0 ? '+' : ''}{evt.surprise_factor}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-zinc-600 border border-zinc-800/50 px-2 py-1.5 rounded-lg">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[8px] uppercase font-sans font-bold tracking-widest">Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configure Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0e0e14] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-indigo-400">
                <Bell className="w-4 h-4" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Automated Deviation Alert Rule
                </h3>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="w-6 h-6 rounded-md bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {alertFormError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
                {alertFormError}
              </div>
            )}

            <form onSubmit={handleCreateAlert} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-zinc-400 uppercase tracking-wider mb-1 text-[10px]">
                  Target Economic Release
                </label>
                <input
                  type="text"
                  value={alertEventName}
                  onChange={(e) => setAlertEventName(e.target.value)}
                  placeholder="e.g. Core CPI (MoM)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase tracking-wider mb-1 text-[10px]">
                    Condition Operator
                  </label>
                  <select
                    value={alertConditionOp}
                    onChange={(e) => setAlertConditionOp(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value="<">Less than (&lt;)</option>
                    <option value="=">Equals (=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase tracking-wider mb-1 text-[10px]">
                    Benchmark Target
                  </label>
                  <select
                    value={alertBenchmark}
                    onChange={(e) => setAlertBenchmark(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="estimate">Consensus / Estimate</option>
                    <option value="previous">Previous Print</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase tracking-wider mb-1 text-[10px]">
                  Variance Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={alertVariance}
                  onChange={(e) => setAlertVariance(e.target.value)}
                  placeholder="0.1"
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAlertSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAlertSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Rule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomicCalendar;
