import { motion } from 'framer-motion';

interface GrowthRadarProps {
    data: Record<string, number>; // e.g., { M: 80, E: 45, D: 60, ... }
    labels?: string[];
    size?: number;
}

export default function GrowthRadar({ data, labels = ['M', 'E', 'D', 'P', 'I', 'C'], size = 200 }: GrowthRadarProps) {
    const center = size / 2;
    const radius = size * 0.4;
    const angleStep = (Math.PI * 2) / labels.length;

    // Helper to get coordinates for a specific value and index
    const getCoords = (value: number, index: number, maxRadius: number) => {
        const angle = index * angleStep - Math.PI / 2; // Start from top
        const r = (value / 100) * maxRadius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Generate background rings
    const rings = [0.25, 0.5, 0.75, 1];
    const ringPaths = rings.map((r) => {
        return labels.map((_, i) => {
            const coords = getCoords(r * 100, i, radius);
            return `${i === 0 ? 'M' : 'L'} ${coords.x} ${coords.y}`;
        }).join(' ') + ' Z';
    });

    // Generate axes
    const axisPaths = labels.map((_, i) => {
        const coords = getCoords(100, i, radius);
        return `M ${center} ${center} L ${coords.x} ${coords.y}`;
    });

    // Generate the actual data shape
    const dataPoints = labels.map((label, i) => {
        const val = data[label] || 10; // offset small for visibility
        return getCoords(val, i, radius);
    });

    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="overflow-visible">
                {/* Background Grid */}
                {ringPaths.map((path, i) => (
                    <path
                        key={i}
                        d={path}
                        fill="none"
                        stroke="rgba(var(--text-muted-rgb), 0.1)"
                        strokeWidth="1"
                    />
                ))}
                {axisPaths.map((path, i) => (
                    <path
                        key={i}
                        d={path}
                        fill="none"
                        stroke="rgba(var(--text-muted-rgb), 0.1)"
                        strokeWidth="1"
                    />
                ))}

                {/* Labels */}
                {labels.map((label, i) => {
                    const coords = getCoords(115, i, radius);
                    return (
                        <text
                            key={i}
                            x={coords.x}
                            y={coords.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-black fill-text-muted select-none"
                            style={{ opacity: 0.6 }}
                        >
                            {label}
                        </text>
                    );
                })}

                {/* Data Shape */}
                <motion.path
                    d={dataPath}
                    fill="rgba(var(--accent-primary-rgb), 0.2)"
                    stroke="rgb(var(--accent-primary-rgb))"
                    strokeWidth="2"
                    initial={false}
                    animate={{ d: dataPath }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />

                {/* Data Points */}
                {dataPoints.map((p, i) => (
                    <motion.circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="rgb(var(--accent-primary-rgb))"
                        initial={false}
                        animate={{ cx: p.x, cy: p.y }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                ))}
            </svg>
        </div>
    );
}
