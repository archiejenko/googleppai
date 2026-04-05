const OastAgnosticBlock = () => {
    return (
        <section className="w-full bg-[#020617] text-[#F5F5F5] border-t-[length:var(--border-width-primary)] border-[#F5F5F5]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 min-h-[500px]">

                {/* Left: Branding & Capability Tag */}
                <div className="md:col-span-5 p-8 md:p-12 border-b-[length:var(--border-width-primary)] md:border-b-0 md:border-r-[length:var(--border-width-primary)] border-[#F5F5F5] flex flex-col justify-between bg-[#ff6b6b]">
                    <div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.8] mt-4 text-[#020617]">
                            OAST <br /> AGNOSTIC.
                        </h2>
                    </div>
                </div>

                {/* Right: The Body Text */}
                <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-[#020617]">
                    <div className="max-w-xl">
                        <p className="precision-body mb-8">
                            OAST is the high-fidelity infrastructure for B2B revenue teams. Our logic engine is sector-agnostic, designed to scale elite performance across any complex mid-market sales cycle.
                        </p>
                        <div className="border-l-4 border-[#F5F5F5] pl-6 py-2">
                            <p className="precision-body">
                                Drive peak operational efficiency with multi-agent intelligence that guarantees consistent, measurable revenue readiness for your entire sales organization.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default OastAgnosticBlock;
