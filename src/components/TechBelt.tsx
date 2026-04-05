const TechBelt = () => {
    const stack = [
        "TECHNOLOGY", "RECRUITMENT", "HEALTHCARE", "TELECOMS",
        "INSURANCE", "FINANCE", "REAL ESTATE", "ENERGY",
        "TECHNOLOGY", "RECRUITMENT", "HEALTHCARE", "TELECOMS",
        "INSURANCE", "FINANCE", "REAL ESTATE", "ENERGY",
    ];

    return (
        <div className="w-full bg-[#020617] border-y-[length:var(--border-width-primary)] border-[#F5F5F5] overflow-hidden py-6" aria-label="Sectors served">
            <div className="flex whitespace-nowrap animate-marquee group">
                {stack.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center mx-8 group-hover:pause"
                    >
                        {/* The Logo Container */}
                        <div className="border border-[#F5F5F5]/40 px-6 py-2 flex items-center gap-3 hover:bg-[#F5F5F5] hover:text-black transition-colors cursor-crosshair">
                            <span className="font-mono text-xs opacity-50">#0{(index % 6) + 1}</span>
                            <span className="font-black text-xl uppercase tracking-tighter">{item}</span>
                        </div>

                        {/* The "Mechanical" Spacer */}
                        <div className="ml-16 h-[2px] w-12 bg-[#F5F5F5]/20 flex items-center justify-center">
                            <div className="w-2 h-2 bg-[#F5F5F5] rotate-45"></div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); } /* Adjusted for doubled/tripled content */
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 60s linear infinite; /* Slowed down for readability */
        }
        .group:hover .animate-marquee {
            animation-play-state: paused;
        }
        /* Utility to pause animation on individual item hover if needed, or group hover */
        .pause {
            animation-play-state: paused;
        }
      `}</style>
        </div>
    );
};

export default TechBelt;
