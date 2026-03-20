import { Link } from 'react-router-dom';
import { ArrowRight, Clock, User } from 'lucide-react';

const blogPosts = [
    {
        id: 'traditional-sales-training',
        title: "Traditional sales training vs. OAST revolution",
        excerpt: "Why 87% of traditional sales training is forgotten within 30 days and how OAST is changing the paradigm with RAG technology.",
        date: 'Feb 5, 2024',
        author: 'OAST Team',
        image: '/assets/screenshots/training_config.png',
        path: '/insights/traditional-sales-training'
    },
    {
        id: 'sales-onboarding-and-churn',
        title: "Sales slow onboarding and high churn rate",
        excerpt: "Exploring the 35% turnover rate in sales and why it takes 6-9 months for reps to become fully productive.",
        date: 'Feb 4, 2024',
        author: 'Sales Intelligence',
        image: '/assets/screenshots/hero_dashboard.png',
        path: '/insights/sales-onboarding-and-churn'
    },
    {
        id: 'the-cost-of-weak-training',
        title: "The cost and ramifications of weak training",
        excerpt: "The $15 billion annual cost of sales training failure and how poor customer experiences damage brand equity.",
        date: 'Feb 3, 2024',
        author: 'Industry Analysis',
        image: '/assets/screenshots/team_overview.png',
        path: '/insights/the-cost-of-weak-training'
    }
];

export default function Insights() {
    return (
        <div className="w-full pb-32">
            {/* Header */}
            <section className="pt-32 pb-20 px-6 md:px-12 text-center max-w-5xl mx-auto">
                <span className="text-oast-accent text-sm font-bold uppercase tracking-widest mb-4 block">Our Blog</span>
                <h1 className="text-5xl md:text-7xl font-display font-bold text-text-primary mb-8 tracking-tight">
                    Industry Insights
                </h1>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto font-light leading-relaxed">
                    Data-driven analysis on sales performance, training methodologies, and the future of AI-powered sales enablement.
                </p>
            </section>

            {/* Blog Grid */}
            <div className="px-6 md:px-12 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post) => (
                        <Link
                            key={post.id}
                            to={post.path}
                            className="group bg-oast-surface border border-oast-border rounded-3xl overflow-hidden hover:border-oast-accent/30 transition-all duration-300 hover:-translate-y-2 flex flex-col"
                        >
                            <div className="aspect-[16/9] overflow-hidden relative">
                                <img
                                    src={post.image}
                                    alt={post.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-oast-navy/60 to-transparent"></div>
                            </div>

                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex items-center gap-4 text-xs text-oast-text-secondary mb-4 uppercase tracking-widest font-bold">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.date}</span>
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                                </div>

                                <h2 className="text-2xl font-display font-bold text-text-primary mb-4 group-hover:text-accent transition-colors">
                                    {post.title}
                                </h2>

                                <p className="text-text-secondary font-light leading-relaxed mb-6 flex-1">
                                    {post.excerpt}
                                </p>

                                <div className="flex items-center gap-2 text-oast-accent font-bold group-hover:gap-3 transition-all">
                                    Read Article <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
