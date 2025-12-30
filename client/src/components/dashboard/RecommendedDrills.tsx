import { Zap, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RecommendedDrills() {
    return (
        <Link to="/learning-path" className="block h-full group">
            <div className="card-hero h-full p-6 relative group-hover:-translate-y-1 transition-transform duration-300">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[rgb(var(--accent-primary)/0.2)] blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-[rgb(var(--accent-primary)/0.3)] transition-colors" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[rgb(var(--accent-primary))] text-white mb-4 shadow-lg shadow-[rgb(var(--accent-primary)/0.4)]">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">
                            Daily Drill: Objection Handling
                        </h3>
                        <p className="text-[rgb(var(--text-muted))] text-sm">
                            Master the "Price Too High" objection with this 5-minute interactive scenario.
                        </p>
                    </div>

                    <div className="flex items-center text-[rgb(var(--accent-primary))] font-medium text-sm mt-4 group-hover:gap-2 transition-all">
                        Start Drill <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
