interface FoundingBadgeProps {
    spotsRemaining: number;
}

export default function FoundingBadge({ spotsRemaining }: FoundingBadgeProps) {
    return (
        <div className="mb-6 space-y-2">
            <span
                className="inline-block text-xs tracking-widest px-3 py-1 bg-[rgb(var(--accent-primary))] text-[rgb(var(--bg-canvas))]"
                style={{ borderRadius: 0 }}
            >
                FOUNDING MEMBER
            </span>
            <p className="text-xs tracking-widest text-[rgb(var(--accent-primary))]">
                {spotsRemaining} FOUNDING SPOTS REMAINING
            </p>
        </div>
    );
}
