import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Building2, ArrowRight } from 'lucide-react';

interface Industry {
    id: string;
    name: string;
    description: string;
    icon: string;
}

export default function Industries() {
    const navigate = useNavigate();
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndustries = async () => {
            try {
                const { data, error } = await supabase
                    .from('industries')
                    .select('*');

                if (error) throw error;
                setIndustries(data || []);
            } catch (error) {
                console.error('Failed to fetch industries', error);
            } finally {
                setLoading(false);
            }
        };
        fetchIndustries();
    }, []);

    const handleSelectIndustry = (industryId: string) => {
        navigate(`/training?industryId=${industryId}`);
    };

    if (loading) {
        return (
            <div className="layout-shell flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]"></div>
            </div>
        );
    }

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12 animate-in-up">
                    <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-3">
                        Industry-Specific Training
                    </h1>
                    <p className="text-[rgb(var(--text-secondary))] text-lg">
                        Practice with scenarios tailored to your industry
                    </p>
                </div>

                {/* Industries Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {industries.map((industry, index) => (
                        <button
                            key={industry.id}
                            onClick={() => handleSelectIndustry(industry.id)}
                            className="card-hero p-8 text-left hover:scale-[1.02] transition-transform animate-in-up group relative overflow-hidden"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="bg-[rgb(var(--accent-primary)/0.1)] p-4 rounded-2xl group-hover:bg-[rgb(var(--accent-primary))] transition-colors duration-300">
                                        <Building2 className="h-8 w-8 text-[rgb(var(--accent-primary))] group-hover:text-white transition-colors duration-300" />
                                    </div>
                                    <ArrowRight className="h-6 w-6 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--accent-primary))] group-hover:translate-x-1 transition-all" />
                                </div>
                                <h3 className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-2 group-hover:text-[rgb(var(--accent-primary))] transition-colors">
                                    {industry.name}
                                </h3>
                                <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
                                    {industry.description || 'Specialized training scenarios for this industry'}
                                </p>
                            </div>

                            {/* Decorative Background Element */}
                            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[rgb(var(--accent-primary)/0.05)] rounded-full blur-2xl group-hover:bg-[rgb(var(--accent-primary)/0.1)] transition-colors"></div>
                        </button>
                    ))}
                </div>

                {/* Empty State */}
                {industries.length === 0 && (
                    <div className="card-os text-center py-16">
                        <Building2 className="h-16 w-16 text-[rgb(var(--text-muted))] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] mb-2">No industries available</h3>
                        <p className="text-[rgb(var(--text-muted))]">Industry-specific scenarios will be added soon!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
