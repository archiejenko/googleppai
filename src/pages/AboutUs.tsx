import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
};

export default function AboutUs() {
    return (
        <div className="w-full">
            {/* Hero */}
            <section className="pt-32 pb-20 px-6 text-center border-b border-border-default/20">
                <motion.p
                    {...fadeUp}
                    className="text-xs font-mono uppercase tracking-[0.3em] text-text-muted mb-4"
                >
                    Who We Are
                </motion.p>
                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-display font-bold text-text-primary mb-6"
                >
                    About OAST
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="text-xl text-text-secondary max-w-2xl mx-auto"
                >
                    We exist to close the gap between training and performance — permanently.
                </motion.p>
            </section>

            <section className="px-6 md:px-12 max-w-5xl mx-auto pb-32 space-y-28 pt-24">

                {/* Our Mission */}
                <motion.div {...fadeUp} className="space-y-6">
                    <span className="text-accent text-xs font-black uppercase tracking-[0.2em]">Our Mission</span>
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">
                        Technology that works as hard as your team.
                    </h2>
                    <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
                        At OAST, our core mission is to use technology to drive efficiency and maximise revenue across the heart of every business. By creating a safe, structured environment for employees to train and learn, we provide actionable data to sales leaders — helping them better understand performance and identify clear areas for improvement.
                    </p>
                    <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
                        With years of direct experience across B2B sales, we have seen first-hand the pain points that hold teams back. We believe that training is the single most critical lever for sustainable revenue growth — and that it should be continuous, measurable, and accessible to every organisation, regardless of size.
                    </p>
                </motion.div>

                {/* Our Story */}
                <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-12 items-start">
                    <div className="space-y-5">
                        <span className="text-accent text-xs font-black uppercase tracking-[0.2em]">Our Story</span>
                        <h2 className="text-3xl font-display font-bold text-text-primary">
                            Built by sales people, for sales people.
                        </h2>
                        <p className="text-text-secondary leading-relaxed">
                            OAST was founded by a team of B2B sales practitioners who had grown frustrated with the gap between the tools available to sales leaders and the reality of the coaching problem they faced every day. Onboarding programmes were static. Feedback cycles were slow. Managers spent the majority of their time reacting rather than developing their people.
                        </p>
                        <p className="text-text-secondary leading-relaxed">
                            We set out to build something different — a platform that could simulate the real pressure of a live sales call, score performance objectively, and surface coaching intelligence without requiring a manager to be in the room. The result is OAST: a mission-critical revenue infrastructure that scales elite performance across entire teams.
                        </p>
                    </div>
                    <div className="bg-bg-surface border border-border-default p-8 space-y-6">
                        <div className="space-y-1">
                            <p className="text-3xl font-display font-bold text-text-primary">30%</p>
                            <p className="text-sm text-text-muted">Average reduction in SDR ramp time</p>
                        </div>
                        <div className="border-t border-border-default/40 pt-6 space-y-1">
                            <p className="text-3xl font-display font-bold text-text-primary">120h+</p>
                            <p className="text-sm text-text-muted">Manager time recaptured per month</p>
                        </div>
                        <div className="border-t border-border-default/40 pt-6 space-y-1">
                            <p className="text-3xl font-display font-bold text-text-primary">85%</p>
                            <p className="text-sm text-text-muted">Strategic playbook adherence rate</p>
                        </div>
                    </div>
                </motion.div>

                {/* Our Values */}
                <motion.div {...fadeUp} className="space-y-10">
                    <div>
                        <span className="text-accent text-xs font-black uppercase tracking-[0.2em]">Our Values</span>
                        <h2 className="text-3xl font-display font-bold text-text-primary mt-3">
                            The principles we build by.
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                title: 'Efficiency',
                                body: 'Technology should work harder than any trainer. We automate the repetitive so that managers can focus entirely on growth, strategy, and their people.',
                            },
                            {
                                title: 'Integrity',
                                body: 'Honest, data-driven feedback — not flattery. Reps and leaders deserve an accurate picture of where they stand and what it will take to improve.',
                            },
                            {
                                title: 'Ambition',
                                body: 'We exist to make your team elite, not just adequate. Every feature we build is designed to push performance further, not simply to track it.',
                            },
                        ].map(({ title, body }) => (
                            <div key={title} className="p-6 border border-border-default bg-bg-surface space-y-3">
                                <div className="w-8 h-1 bg-accent" />
                                <h3 className="text-lg font-display font-bold text-text-primary">{title}</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Technology Ethos */}
                <motion.div {...fadeUp} className="space-y-6 border-t border-border-default/40 pt-16">
                    <span className="text-accent text-xs font-black uppercase tracking-[0.2em]">Our Approach to Technology</span>
                    <h2 className="text-3xl font-display font-bold text-text-primary">
                        AI that augments — never replaces — human judgement.
                    </h2>
                    <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
                        OAST is built on the principle that artificial intelligence should serve the sales leader, not substitute for them. Our models score conversations, surface insights, and flag coaching opportunities — but the decisions remain with your team. All data is processed in accordance with GDPR and the EU AI Act, and we do not use customer call data to train third-party models.
                    </p>
                    <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
                        We integrate with the tools your team already uses — from CRM platforms to telephony systems — so that OAST becomes part of your workflow rather than an additional burden. Deployment is fast, measurable, and supported throughout by our team.
                    </p>
                </motion.div>

                {/* CTA */}
                <motion.div
                    {...fadeUp}
                    className="text-center py-16 border-t border-border-default/40 space-y-6"
                >
                    <h2 className="text-3xl font-display font-bold text-text-primary">
                        Ready to see it in action?
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto">
                        See how OAST works for your team, or explore our pricing to find the right tier for your organisation.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link
                            to="/#demo-video"
                            className="px-8 py-4 bg-accent text-white font-bold text-sm uppercase tracking-[0.15em] hover:bg-accent/90 transition-colors"
                        >
                            See How OAST Works
                        </Link>
                        <Link
                            to="/pricing"
                            className="px-8 py-4 border border-border-default text-text-primary font-bold text-sm uppercase tracking-[0.15em] hover:bg-bg-surface transition-colors"
                        >
                            View Pricing
                        </Link>
                    </div>
                </motion.div>

            </section>
        </div>
    );
}
