import { motion } from 'framer-motion';
import { Shield, Zap, X } from 'lucide-react';

interface BattleCardProps {
    objection: string;
    response: string;
    onDismiss: () => void;
}

export default function BattleCard({ objection, response, onDismiss }: BattleCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            className="fixed bottom-32 left-1/2 z-[100] w-full max-w-xl"
        >
            <div className="relative p-1 bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-[0_0_50px_rgba(245,158,11,0.3)] group">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl" />

                <div className="relative bg-slate-900/90 p-8 overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-500/20 border border-amber-500/30">
                                <Shield className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Objection Detected</h3>
                                <p className="text-2xl font-display font-bold text-white tracking-tight">"{objection}"</p>
                            </div>
                        </div>
                        <button
                            onClick={onDismiss}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Best Practice Response</span>
                            </div>
                            <p className="text-lg text-slate-200 leading-relaxed italic font-light">
                                {response}
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tactical Tip:</span>
                                <span className="text-[10px] font-bold text-slate-300">Empathize first, then pivot to value.</span>
                            </div>
                            <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                                <span className="text-[10px] font-bold text-amber-500">+25XP Potential</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
