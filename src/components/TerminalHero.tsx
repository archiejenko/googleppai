import { useState, useEffect } from 'react';

const TerminalHero = () => {
    const [logs, setLogs] = useState(['[SYSTEM]: Loading OAST Framework...', '[OK]: Network Handshake Established.']);

    const systemMessages = [
        "[INFO]: Optimizing build latency...",
        "[STATUS]: 10.0.4.1 connected via Secure Tunnel.",
        "[DB]: Querying encrypted infrastructure nodes...",
        "[OK]: Latency sub-1ms confirmed.",
        "[WARN]: Unused AI-fluff detected and purged.",
        "[SYSTEM]: Nordic Brutalist architecture active."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setLogs(prev => [...prev.slice(-6), systemMessages[Math.floor(Math.random() * systemMessages.length)]]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-3xl border-[length:var(--border-width-primary)] border-[#F5F5F5] bg-[#020617] shadow-[8px_8px_0px_0px_#F5F5F5] overflow-hidden rounded-none">
            {/* Terminal Header */}
            <div className="bg-[#F5F5F5] p-2 flex justify-between items-center border-b-[length:var(--border-width-primary)] border-[#020617]">
                <span className="text-[#020617] font-mono text-xs font-black uppercase tracking-widest">EJTECH_SYSTEM_v2.0.4</span>
                <div className="flex gap-2">
                    <div className="w-3 h-3 border-[2px] border-[#020617]"></div>
                    <div className="w-3 h-3 border-[2px] border-[#020617] bg-[#020617]"></div>
                </div>
            </div>

            {/* Terminal Body */}
            <div className="p-6 font-mono text-sm sm:text-base h-64 overflow-hidden flex flex-col justify-end">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="text-[#F5F5F5] opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        <span className="text-[#F5F5F5]">{log}</span>
                    </div>
                ))}
                <div className="w-2 h-5 bg-[#F5F5F5] animate-pulse mt-2 inline-block"></div>
            </div>
        </div>
    );
};

export default TerminalHero;
