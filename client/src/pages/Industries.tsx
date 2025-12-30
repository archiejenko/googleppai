import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import api from '../utils/api';
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
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-purple-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-white mb-2">
                        Industry-Specific Training
                    </h1>
                    <p className="text-gray-300 text-lg">
                        Practice with scenarios tailored to your industry
                    </p>
                </div>

                {/* Industries Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {industries.map((industry, index) => (
                        <button
                            key={industry.id}
                            onClick={() => handleSelectIndustry(industry.id)}
                            className="glass-card p-8 text-left hover:scale-105 transition-transform animate-fade-in-up group"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-xl">
                                    <Building2 className="h-8 w-8 text-white" />
                                </div>
                                <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {industry.name}
                            </h3>
                            <p className="text-gray-300">
                                {industry.description || 'Specialized training scenarios for this industry'}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Empty State */}
                {industries.length === 0 && (
                    <div className="glass-card text-center py-16">
                        <Building2 className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No industries available</h3>
                        <p className="text-gray-300">Industry-specific scenarios will be added soon!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
