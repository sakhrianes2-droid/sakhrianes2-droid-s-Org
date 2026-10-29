import { useEffect, useState, useRef } from 'react';
import { CommandCenter } from './CommandCenter';
import { createAuthenticatedWebSocket } from '../../lib/supabase';

const TradingTerminal = () => {
    const [logs, setLogs] = useState([]);
    const [connected, setConnected] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!connected) {
            // Mock generator removed to ensure only real signals are displayed.
        }
    }, [connected]);

    useEffect(() => {
        let isSubscribed = true;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = createAuthenticatedWebSocket(`${wsProtocol}//${window.location.host}/ws/terminal`);
        socket.onopen = () => { if (isSubscribed) setConnected(true); };
        socket.onmessage = (event) => {
            if (!isSubscribed) return;
            try {
                const data = JSON.parse(event.data);
                let content = data.content || (data.type === "signals" ? `$[SYSTEM] Updated ${data.data.length} signals.` : JSON.stringify(data));
                setLogs((prev) => [...prev, content].slice(-200));
            } catch {
                setLogs((prev) => [...prev, event.data].slice(-200));
            }
        };
        socket.onclose = () => { if (isSubscribed) setConnected(false); };
        return () => {
            isSubscribed = false;
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-black overflow-hidden relative">
            <div 
                ref={scrollRef}
                className="flex-1 h-full overflow-y-auto p-4 md:p-8 scroll-smooth"
            >
                <div className="flex flex-col gap-8 pb-20">
                    {logs.length === 0 && (
                        <div className="text-white opacity-20 text-4xl font-black mt-20 text-center uppercase tracking-tighter">
                            Waiting_for_signals...
                        </div>
                    )}
                    {logs.map((log, index) => {
                        const isSignal = log.includes('SIGNAL');
                        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
                        
                        return (
                            <div 
                                key={index} 
                                className={`flex flex-col ${isSignal ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}
                            >
                                <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest opacity-40 text-white">
                                    <span>{isSignal ? 'SIGNAL_OUT' : 'SYSTEM_IN'}</span>
                                    <span>{time}</span>
                                </div>
                                
                                <div 
                                    className={`max-w-[95%] md:max-w-[90%] p-4 md:p-6 border-2 md:border-4 transition-all ${
                                        isSignal 
                                            ? 'bg-white text-black border-white font-black text-lg md:text-xl shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] md:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)]' 
                                            : 'bg-black text-white border-white text-xs md:text-sm font-bold'
                                    }`}
                                >
                                    <span className="whitespace-pre-wrap leading-tight">
                                        {log}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Command Center Panel */}
            <div className="h-[50vh] md:h-full md:w-[400px] shrink-0 border-t-4 md:border-t-0 border-white z-10 bg-white">
                <CommandCenter />
            </div>
            
            {/* Minimal Status Overlay */}
            <div className="fixed bottom-4 left-4 bg-white text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black z-20">
                {connected ? 'LINK_ACTIVE' : 'LINK_OFFLINE'}
            </div>
        </div>
    );
};

export default TradingTerminal;
