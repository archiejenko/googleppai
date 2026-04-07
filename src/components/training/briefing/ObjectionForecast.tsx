import { useState } from 'react';
import { supabase } from '../../../utils/supabase';

interface ObjectionForecastProps {
    objections: string[];
    onGenerate: (objections: string[]) => void;
    prospectName: string;
    prospectCompany: string;
    callPurpose: string;
}

export default function ObjectionForecast({
    objections,
    onGenerate,
    prospectName,
    prospectCompany,
    callPurpose,
}: ObjectionForecastProps) {
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        if (!prospectCompany) return;
        setLoading(true);
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch(`${supabaseUrl}/functions/v1/generate-precall-brief`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                    apikey: supabaseKey,
                },
                body: JSON.stringify({
                    prospect_name: prospectName,
                    prospect_company: prospectCompany,
                    call_purpose: callPurpose || 'Sales discovery call',
                }),
            });

            if (!res.ok) throw new Error('Failed to generate brief');
            const brief = await res.json();
            onGenerate(brief.likely_objections || []);
        } catch {
            // silently leave existing objections
        } finally {
            setLoading(false);
        }
    };

    const placeholder = ['Pricing concerns', 'Current vendor relationship', 'Timeline constraints'];
    const displayed = objections.length > 0 ? objections.slice(0, 3) : [];

    return (
        <div className="bg-bg-surface border border-[#2a2a2e] p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                    Objection Forecast — Morgan AI
                </h2>
                <button
                    type="button"
                    onClick={generate}
                    disabled={loading || !prospectCompany}
                    className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        loading
                            ? 'border-accent/40 text-accent animate-pulse'
                            : 'border-[#2a2a2e] text-text-muted hover:border-accent/60 hover:text-accent'
                    }`}
                >
                    {loading ? 'Analysing…' : 'Generate Intel'}
                </button>
            </div>

            {displayed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {displayed.map((obj, i) => (
                        <div
                            key={i}
                            className="bg-bg-canvas border border-[#2a2a2e] border-l-2 border-l-amber-400 p-3"
                        >
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1">
                                Likely #{i + 1}
                            </div>
                            <p className="text-xs text-text-secondary leading-relaxed">{obj}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {placeholder.map((label, i) => (
                        <div key={i} className="bg-bg-canvas border border-dashed border-[#2a2a2e] p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted/40 mb-1">
                                Likely #{i + 1}
                            </div>
                            <p className="text-xs text-text-muted/40 leading-relaxed">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {!prospectCompany && (
                <p className="text-[9px] text-text-muted mt-3">Enter company name above to enable intel generation.</p>
            )}
        </div>
    );
}
