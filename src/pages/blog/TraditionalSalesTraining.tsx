import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';

export default function TraditionalSalesTraining() {
    return (
        <article className="w-full pb-32">
            <div className="max-w-4xl mx-auto px-6 md:px-12 pt-32">
                {/* Back Button */}
                <Link to="/insights" className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-12 group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Insights
                </Link>

                {/* Header */}
                <header className="mb-16">
                    <div className="flex items-center gap-6 text-sm text-text-secondary mb-8 uppercase tracking-widest font-bold border-b border-border-default pb-8">
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Feb 5, 2024</span>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 6 Min Read</span>
                        <button className="ml-auto hover:text-text-primary transition-colors flex items-center gap-2">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-text-primary mb-8 leading-tight">
                        Traditional Sales Training vs. The OAST Revolution
                    </h1>
                    <p className="text-xl text-text-secondary font-light leading-relaxed">
                        Why the $15 billion industry is failing its workforce, and how Retrieval-Augmented Generation (RAG) is creating a new paradigm for skill acquisition.
                    </p>
                </header>

                {/* Featured Image */}
                <div className="aspect-[21/9] rounded-3xl overflow-hidden border border-border-default mb-16">
                    <img
                        src="/assets/screenshots/training_config.png"
                        alt="OAST Training Configuration"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-lg max-w-none space-y-8 text-oast-text-secondary font-light leading-relaxed">
                    <p>
                        For decades, the standard for sales training has been the "one-and-done" workshop. Companies fly their teams to a central location, subject them to two days of intensive lectures, role-plays, and PowerPoint decks, and then send them back to the field.
                    </p>

                    <h2 className="text-3xl font-display font-bold text-white mt-12 mb-6">The "Forgetting Curve" Problem</h2>
                    <p>
                        Research by <strong className="text-text-primary">Hermann Ebbinghaus</strong> on the "Forgetting Curve" indicates a brutal reality for sales leaders: <strong className="text-text-primary">87% of training content is forgotten within 30 days</strong> if it's not reinforced through active practice (Source: Sales-Alliance). Without a mechanism to turn theory into muscle memory, the return on investment for traditional training is effectively zero for the vast majority of participants.
                    </p>

                    <h2 className="text-3xl font-display font-bold text-white mt-12 mb-6">Enter the OAST Revolution</h2>
                    <p>
                        OAST (Objective Automated Sales Training) is positioned to revolutionise the industry by replacing static learning with <strong className="text-white">Dynamic AI Simulation</strong>. By utilising Retrieval-Augmented Generation (RAG), we provide sales reps with an environment that isn't just a "playground"—it's a high-fidelity mirror of real customer interactions.
                    </p>

                    <blockquote className="border-l-4 border-oast-accent pl-8 py-4 my-12 bg-oast-surface rounded-r-2xl border border-oast-border">
                        <p className="italic text-xl text-white">
                            "The difference between traditional training and OAST is the difference between reading a flight manual and flying in a Grade-A simulator."
                        </p>
                    </blockquote>

                    <h2 className="text-3xl font-display font-bold text-white mt-12 mb-6">RAG Technology: The Secret Sauce</h2>
                    <p>
                        Unlike standard chatbots, OAST uses RAG to pull from a company's specific product knowledge, competitive landscape, and historical call data. This ensures that every simulation is sector-specific and company-aligned. Reps aren't just practising "sales"—they're practising <em className="text-white">their</em> sales process.
                    </p>

                    <p>
                        The results are measurable. Teams using AI-guided simulators report a <strong className="text-text-primary">58% increase in overall team productivity</strong> and a significant reduction in the time it takes for new hires to reach their first successful deal (Source: CirrusInsight).
                    </p>
                </div>
            </div>
        </article>
    );
}
