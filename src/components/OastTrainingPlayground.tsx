import { useState } from 'react';

const OastTrainingPlayground = () => {
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [correction, setCorrection] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleCorrection = () => {
        setIsSubmitted(true);
        setTimeout(() => {
            setIsCorrecting(false);
            setIsSubmitted(false);
        }, 2000);
    };

    return (
        <section className="w-full bg-black text-[#F5F5F5] border-t-[length:var(--border-width-primary)] border-[#F5F5F5]">
            <div className="grid grid-cols-1 lg:grid-cols-2">

                {/* Left: Content & Tiers */}
                <div className="p-8 md:p-16 border-b-[length:var(--border-width-primary)] lg:border-b-0 lg:border-r-[length:var(--border-width-primary)] border-[#F5F5F5]">
                    <h2 className="text-5xl font-black uppercase mb-8 leading-none text-[#F5F5F5]">
                        Universal <br /> Development.
                    </h2>
                    <p className="text-lg mb-12 opacity-90 max-w-md">
                        OAST provides a uniform learning path that adapts to the user. Whether onboarding a new hire or refining a veteran, the framework delivers consistent, high-performance training.
                    </p>

                    {/* Tier Grid */}
                    <div className="space-y-4">
                        {['LVL_01: Foundation', 'LVL_02: Advanced_Tactics', 'LVL_03: Strategic_Leadership'].map((lvl) => (
                            <div key={lvl} className="border border-[#F5F5F5] p-4 flex justify-between items-center hover:bg-[#F5F5F5] hover:text-black transition-colors cursor-pointer group">
                                <span className="font-mono text-sm">{lvl}</span>
                                <span className="text-xs uppercase font-bold group-hover:translate-x-1 transition-transform">Access_Path →</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: The Playground Feature */}
                <div className="p-8 md:p-16 bg-[#0A0A0A] flex flex-col justify-center border-l-[length:var(--border-width-primary)] border-[#F5F5F5] lg:border-l-0">
                    <div className="border-[length:var(--border-width-primary)] border-[#F5F5F5] shadow-[10px_10px_0px_0px_#F5F5F5] bg-black overflow-hidden rounded-none">
                        {/* Playground Header */}
                        <div className="bg-[#F5F5F5] text-black px-4 py-1 flex justify-between items-center">
                            <span className="font-mono text-xs font-bold">OAST_PLAYGROUND // PITCH_SIMULATOR</span>
                            <span className="text-xs">v4.0.1</span>
                        </div>

                        {/* Simulation Interface */}
                        <div className="p-6 space-y-4 font-mono transition-all duration-300">
                            {isSubmitted ? (
                                <div className="py-8 text-center animate-pulse">
                                    <p className="text-cyan-400 text-sm">{">"} TOKEN_CAPTURED: HIGH_WEIGHT_REFINEMENT_IN_PROGRESS</p>
                                    <p className="text-xs opacity-50 mt-2">Adjusting RAG engine based on your correction...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-green-400 text-sm"> {">"} INITIALIZING NEW_PRODUCT_PITCH...</div>
                                    <div className="bg-[#1a1a1a] p-3 border border-[#F5F5F5]/20">
                                        <p className="text-[#F5F5F5] text-xs opacity-50 mb-2">// INPUT_STREAM:</p>
                                        <p className="text-[#F5F5F5] italic">"Our new API layer reduces integration friction by 40%..."</p>
                                    </div>
                                    <div className="text-cyan-400 text-sm flex justify-between">
                                        <span>{">"} ANALYSIS: IMPACT_SCORE: 88%</span>
                                        {!isCorrecting && (
                                            <button
                                                onClick={() => setIsCorrecting(true)}
                                                className="text-[10px] bg-[#F5F5F5] text-black px-2 hover:bg-cyan-400 transition-colors"
                                            >
                                                CORRECT_AI
                                            </button>
                                        )}
                                    </div>

                                    {isCorrecting ? (
                                        <div className="space-y-3 animate-in-up">
                                            <p className="text-xs opacity-50 uppercase tracking-tighter text-yellow-500">Mode: AGENTIC_LEARNING_LOOP (ACTIVE)</p>
                                            <textarea
                                                className="w-full bg-[#1a1a1a] border border-yellow-500/50 p-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-yellow-500"
                                                placeholder="Flag inaccuracy or suggest technical refinement..."
                                                value={correction}
                                                onChange={(e) => setCorrection(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleCorrection}
                                                    className="flex-1 bg-yellow-500 text-black py-2 text-[10px] font-bold uppercase hover:bg-yellow-400"
                                                >
                                                    Inject Correction
                                                </button>
                                                <button
                                                    onClick={() => setIsCorrecting(false)}
                                                    className="px-4 border border-[#F5F5F5]/30 text-[10px] uppercase hover:bg-[#F5F5F5]/10"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex gap-2 h-4 items-center">
                                                <div className="h-2 flex-1 bg-[#F5F5F5]/20 overflow-hidden">
                                                    <div className="h-full bg-[#F5F5F5] w-[88%] animate-pulse"></div>
                                                </div>
                                                <span className="text-xs">88%</span>
                                            </div>
                                            <p className="text-xs opacity-50 tracking-tighter uppercase">Feedback: Pivot to latency metrics for technical stakeholders.</p>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <p className="mt-8 font-mono text-xs text-center uppercase tracking-widest opacity-60">
                        {isCorrecting ? 'FEEDBACK_SESSION: ACTIVE_AGENT_LOOP' : 'Real-time testing for new product launches.'}
                    </p>
                </div>

            </div>
        </section>
    );
};

export default OastTrainingPlayground;
