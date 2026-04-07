interface PersonaBadgeProps {
    name: string;
    title: string;
    company?: string;
}

export default function PersonaBadge({ name, title, company }: PersonaBadgeProps) {
    return (
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-bg-canvas border border-[#2a2a2e]">
            <div className="w-1.5 h-1.5 bg-amber-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400">
                {name}
            </span>
            {(title || company) && (
                <span className="text-[10px] text-text-muted">
                    {[title, company].filter(Boolean).join(', ')}
                </span>
            )}
        </div>
    );
}
