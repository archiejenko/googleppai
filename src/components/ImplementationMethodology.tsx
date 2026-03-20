

const ImplementationMethodology = () => {
    const phases = [
        {
            id: "01",
            title: "Phase_01: Revenue Audit",
            subtitle: "Strategic Gap Analysis",
            desc: "Data-driven audit of your current revenue engine to isolate and eliminate performance bottlenecks."
        },
        {
            id: "02",
            title: "Phase_02: Alignment",
            subtitle: "Playbook Injection",
            desc: "Injecting your specific strategic playbooks and buyer personas into the OAST engine for high-fidelity alignment."
        },
        {
            id: "03",
            title: "Phase_03: Deployment",
            subtitle: "Performance Simulation",
            desc: "Deploying your team into high-stakes simulations to build deterministic muscle memory against procurement resistance."
        },
        {
            id: "04",
            title: "Phase_04: Optimisation",
            subtitle: "Revenue Feedback Loops",
            desc: "Optimizing revenue performance through real-time feedback loops that connect training outcomes directly to closed ARR."
        }
    ];

    return (
        <section className="w-full bg-[#020617] border-y-[length:var(--border-width-primary)] border-[#F5F5F5] py-24 px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-[#F5F5F5] mb-4 uppercase">
                        Implementation <br /> Methodology
                    </h2>
                    <div className="h-1 w-24 bg-[#F5F5F5]"></div>
                </div>

                <div className="space-y-0">
                    {phases.map((phase) => (
                        <div key={phase.id} className="relative pl-8 md:pl-16 py-8 border-l-[length:var(--border-width-primary)] border-[#F5F5F5] group">
                            {/* Node Connector */}
                            <div className="absolute left-[-5px] top-10 w-2.5 h-2.5 bg-[#020617] border-[length:var(--border-width-primary)] border-[#F5F5F5] group-hover:bg-[#F5F5F5] transition-colors"></div>

                            <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-2">
                                <span className="font-mono text-[#F5F5F5] text-sm opacity-60">{phase.title}</span>
                                <h3 className="text-2xl md:text-3xl font-black text-[#F5F5F5] uppercase">{phase.subtitle}</h3>
                            </div>

                            <p className="max-w-2xl precision-body">
                                {phase.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ImplementationMethodology;
