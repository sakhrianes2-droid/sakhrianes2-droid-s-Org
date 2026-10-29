import React, { useState } from 'react';
import { authFetch } from '../../lib/supabase';

const API_BASE = '';

const BrutalistButton = ({ onClick, isLoading, children, danger }) => {
    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`
                relative w-full px-4 py-3 font-black text-sm uppercase tracking-widest border-4 border-black transition-all
                ${isLoading ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-black hover:text-white'}
                ${danger && !isLoading ? 'hover:bg-black hover:text-white border-black' : ''}
                rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px]
            `}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-current animate-ping" />
                    EXECUTING...
                </span>
            ) : children}
        </button>
    );
};

const BrutalistInput = ({ placeholder, value, onChange, type = "text" }) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 bg-white text-black border-4 border-black text-sm font-bold placeholder:text-zinc-400 placeholder:font-black placeholder:uppercase focus:outline-none rounded-none"
    />
);

export const CommandCenter = () => {
    const [loadingState, setLoadingState] = useState({
        stop: false,
        start: false,
        close: false,
        risk: false
    });
    const [closeSignalId, setCloseSignalId] = useState('');
    const [riskAsset, setRiskAsset] = useState('');
    const [riskSl, setRiskSl] = useState('');
    const [riskTp, setRiskTp] = useState('');
    const [lastAction, setLastAction] = useState(null);

    const handleCommand = async (action, endpoint, method, payload = null) => {
        setLoadingState(prev => ({ ...prev, [action]: true }));
        try {
            const res = await authFetch(`${API_BASE}${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payload ? JSON.stringify(payload) : null
            });
            const data = await res.json();
            setLastAction(`SUCCESS: ${data.message || action}`);
        } catch (err) {
            setLastAction(`ERROR: ${err.message || 'Network failure'}`);
        } finally {
            setLoadingState(prev => ({ ...prev, [action]: false }));
            setTimeout(() => setLastAction(null), 3000);
        }
    };

    return (
        <div className="w-full md:w-[400px] h-full bg-white border-l-4 border-black flex flex-col rounded-none overflow-y-auto">
            <div className="p-6 bg-black text-white border-b-4 border-black">
                <h2 className="text-2xl font-black uppercase tracking-tighter">CMD_CTRL</h2>
                <p className="text-[10px] font-bold tracking-widest opacity-70">SECURE UPLINK ACTIVE</p>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-8">
                
                {/* SYSTEM OVERRIDE */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2">1. System Override</h3>
                    <div className="flex gap-4">
                        <BrutalistButton 
                            danger 
                            isLoading={loadingState.stop}
                            onClick={() => handleCommand('stop', '/api/command/stop', 'POST')}
                        >
                            EMERGENCY STOP
                        </BrutalistButton>
                        <BrutalistButton 
                            isLoading={loadingState.start}
                            onClick={() => handleCommand('start', '/api/command/start', 'POST')}
                        >
                            SYSTEM RESUMED
                        </BrutalistButton>
                    </div>
                </section>

                {/* MANUAL INTERVENTION */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2">2. Manual Intervention</h3>
                    <BrutalistInput 
                        placeholder="SIGNAL ID (e.g. 12)" 
                        value={closeSignalId} 
                        onChange={e => setCloseSignalId(e.target.value)} 
                    />
                    <BrutalistButton 
                        isLoading={loadingState.close}
                        onClick={() => handleCommand('close', '/api/command/close', 'POST', { signal_id: closeSignalId })}
                    >
                        TRADE CLOSED MANUALLY
                    </BrutalistButton>
                </section>

                {/* RISK PARAMETERS */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest border-b-4 border-black pb-2">3. Risk Parameters</h3>
                    <BrutalistInput 
                        placeholder="ASSET (e.g. BTC)" 
                        value={riskAsset} 
                        onChange={e => setRiskAsset(e.target.value)} 
                    />
                    <div className="flex gap-4">
                        <BrutalistInput 
                            placeholder="SL % (e.g. 0.01)" 
                            value={riskSl} 
                            onChange={e => setRiskSl(e.target.value)} 
                        />
                        <BrutalistInput 
                            placeholder="TP % (e.g. 0.02)" 
                            value={riskTp} 
                            onChange={e => setRiskTp(e.target.value)} 
                        />
                    </div>
                    <BrutalistButton 
                        isLoading={loadingState.risk}
                        onClick={() => handleCommand('risk', '/api/command/risk', 'PUT', { asset: riskAsset, sl_pct: parseFloat(riskSl), tp_pct: parseFloat(riskTp) })}
                    >
                        UPDATE RISK
                    </BrutalistButton>
                </section>

            </div>

            {/* ACTION STATUS LOG */}
            <div className="h-16 mt-auto border-t-4 border-black bg-white p-4 flex items-center">
                <span className={`text-[10px] font-black uppercase tracking-widest ${lastAction && lastAction.includes('ERROR') ? 'text-black' : 'text-black'}`}>
                    {lastAction ? `> ${lastAction}` : '> AWAITING COMMAND...'}
                </span>
            </div>
        </div>
    );
};
