interface SeatCalculatorProps {
    seats: number;
    onChange: (seats: number) => void;
    displayPrice: number;
    billingCycle: 'monthly' | 'annual';
    includesDeploymentFee: boolean;
}

export default function SeatCalculator({
    seats,
    onChange,
    displayPrice,
    billingCycle,
    includesDeploymentFee,
}: SeatCalculatorProps) {
    const recurringTotal = displayPrice * seats;
    const annualTotal = recurringTotal * 12;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) onChange(val);
    };

    return (
        <div className="border border-white/10 p-4 space-y-3" style={{ borderRadius: 0 }}>
            {/* Seat input */}
            <div className="flex items-center justify-between gap-4">
                <label className="text-xs tracking-widest text-[rgb(var(--text-muted))]">USERS</label>
                <input
                    type="number"
                    min={1}
                    value={seats}
                    onChange={handleChange}
                    className="w-20 text-right bg-[rgb(var(--bg-canvas))] border border-white/20 px-2 py-1 text-[rgb(var(--text-primary))] text-sm focus:outline-none focus:border-white/40"
                    style={{ borderRadius: 0 }}
                />
            </div>

            {/* Recurring total */}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-xs tracking-widest text-[rgb(var(--text-muted))]">
                    {billingCycle === 'annual' ? 'ANNUAL TOTAL' : 'MONTHLY TOTAL'}
                </span>
                <span className="text-lg text-[rgb(var(--text-primary))]">
                    £{billingCycle === 'annual'
                        ? annualTotal.toLocaleString('en-GB')
                        : recurringTotal.toLocaleString('en-GB')}
                </span>
            </div>

            {/* Deployment fee line */}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
                <span className="text-xs tracking-widest text-[rgb(var(--text-muted))]">
                    DEPLOYMENT FEE
                </span>
                {includesDeploymentFee ? (
                    <span className="text-sm text-[rgb(var(--text-secondary))]">+ £2,000 one-time</span>
                ) : (
                    <span className="text-sm text-[rgb(var(--accent-primary))]">£0 — WAIVED</span>
                )}
            </div>
        </div>
    );
}
