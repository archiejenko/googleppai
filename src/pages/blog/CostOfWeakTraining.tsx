import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';

export default function CostOfWeakTraining() {
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
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Feb 3, 2024</span>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 7 Min Read</span>
                        <button className="ml-auto hover:text-text-primary transition-colors flex items-center gap-2">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-text-primary mb-8 leading-tight">
                        The $15 Billion Hole: The Cost of Weak Training
                    </h1>
                    <p className="text-xl text-text-secondary font-light leading-relaxed">
                        Quantifying the ramifications of poor sales training, from wasted investment to long-term brand damage.
                    </p>
                </header>

                {/* Featured Image */}
                <div className="aspect-[21/9] rounded-3xl overflow-hidden border border-border-default mb-16">
                    <img
                        src="/assets/screenshots/team_overview.png"
                        alt="Team Performance Overview"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Content */}
                <div className="prose prose-lg max-w-none space-y-8 text-text-secondary font-light leading-relaxed">
                    <p>
                        In the United States alone, companies spend over <strong className="text-text-primary">$15 billion on sales training every single year</strong>. Yet, despite this massive expenditure, the results are often underwhelming. When training is weak, the costs are both direct (budget loss) and indirect (opportunity cost and brand damage).
                    </p>

                    <h2 className="text-3xl font-display font-bold text-text-primary mt-12 mb-6">The Direct Cost of Failure</h2>
                    <p>
                        The average annual expenditure per employee for sales training is around <strong className="text-text-primary">$2,000</strong>. When you factor in the turnover rate mentioned in our previous article, it's estimated that losing a single employee costs an organisation <strong className="text-text-primary">33% of that employee’s annual salary</strong> (Source: Elite Business Magazine). If the departure is due to poor onboarding or a lack of support, that $2,000 training investment is essentially flushed down the drain.
                    </p>

                    <h2 className="text-3xl font-display font-bold text-white mt-12 mb-6">The Hidden Danger: Brand Ramifications</h2>
                    <p>
                        Beyond the balance sheet lies a more dangerous threat: the customer experience. A poorly trained sales representative is more than just an expense; they are a threat to your brand equity.
                    </p>

                    <p>
                        A PwC study found that <strong className="text-white">32% of customers would stop interacting with a brand after just one negative experience</strong>. When a rep fumbles an objection or provides incorrect product data due to weak training, you aren't just losing that deal—you may be losing that customer for life.
                    </p>

                    <h2 className="text-3xl font-display font-bold text-text-primary mt-12 mb-6">The Ramifications of "Skill Gaps"</h2>
                    <ul className="space-y-4 list-disc pl-6 text-text-secondary">
                        <li><strong className="text-text-primary">Missed Quotas:</strong> Organizations with formal training see 15% more salespeople achieving their quotas.</li>
                        <li><strong className="text-text-primary">Lower Confidence:</strong> Only 11% of reps feel truly confident making client calls without simulated practice.</li>
                        <li><strong className="text-text-primary">Wasted Pipeline:</strong> 68% of reps lack the knowledge to probe and question prospects effectively, leading to qualified leads dying on the vine.</li>
                    </ul>

                    <h2 className="text-3xl font-display font-bold text-white mt-12 mb-6">The High ROI of Doing it Right</h2>
                    <p>
                        It's not all doom and gloom. Effective sales training—particularly when augmented by AI simulations—offers an average return on investment (ROI) of <strong className="text-white">353%</strong>. For every $1 invested in robust training, businesses generate approximately $4.53 in new revenue (Source: MuchBetter.ai).
                    </p>

                    <p>
                        The choice is simple: continue contributing to the $15 billion hole of traditional training, or invest in a data-driven, objective system that actually sticks.
                    </p>

                    <p className="italic text-sm mt-8 border-t border-border-default pt-4">
                        Sources: PwC Brand Experience Study, Elite Business Magazine, muchbetter.ai ROI analysis (2023).
                    </p>
                </div>
            </div>
        </article>
    );
}
