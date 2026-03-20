

const IndustryHeatmap = () => {
    const industries = [
        { name: "TECHNOLOGY", opacity: "opacity-100" },
        { name: "RECRUITMENT", opacity: "opacity-80" },
        { name: "HEALTHCARE", opacity: "opacity-60" },
        { name: "TELECOMS", opacity: "opacity-40" },
        { name: "INSURANCE", opacity: "opacity-90" },
        { name: "FINANCE", opacity: "opacity-70" },
        { name: "REAL ESTATE", opacity: "opacity-50" },
        { name: "ENERGY", opacity: "opacity-30" },
    ];

    return (
        <section className="w-full bg-[#020617] border-y-[length:var(--border-width-primary)] border-[#F5F5F5]">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
                {industries.map((ind) => (
                    <div
                        key={ind.name}
                        className={`
              aspect-square md:aspect-[2/1] 
              flex items-center justify-center 
              bg-[#F5F5F5] ${ind.opacity}
              border border-black
              transition-all duration-300 hover:opacity-100 cursor-default
            `}
                    >
                        <span className="font-black text-black text-sm md:text-lg tracking-tighter">
                            {ind.name}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default IndustryHeatmap;
