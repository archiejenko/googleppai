

const mockReps = [
    { id: 1, name: "Sarah Connor", risk: "High", metric: "Objection Handling", score: 42, activity: "2d ago" },
    { id: 2, name: "John Wick", risk: "Medium", metric: "Closing", score: 68, activity: "5h ago" },
    { id: 3, name: "Ellen Ripley", risk: "Low", metric: "Discovery", score: 85, activity: "1h ago" },
];

export default function RepsAtRiskTable() {
    const scoreColor = (s: number) => s >= 80 ? '#4ADE80' : s >= 60 ? '#FBBF24' : '#FF6B6B';
    const scoreBg = (s: number) => s >= 80 ? 'rgba(74,222,128,0.12)' : s >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(255,107,107,0.12)';

    return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg h-full flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgb(var(--border-default))] flex justify-between items-center">
                <h3 className="card-title !mb-0">Focus Areas</h3>
                <button className="text-[10px] text-[#FF6B6B] hover:underline font-semibold uppercase tracking-wider">View All</button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="table-os w-full">
                    <thead>
                        <tr>
                            <th>Rep Name</th>
                            <th>Metric Gap</th>
                            <th>Score</th>
                            <th>Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockReps.map((rep) => (
                            <tr key={rep.id}>
                                <td className="font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{ background: rep.risk === 'High' ? '#F87171' : rep.risk === 'Medium' ? '#FBBF24' : '#4ADE80' }}
                                        />
                                        {rep.name}
                                    </div>
                                </td>
                                <td>{rep.metric}</td>
                                <td>
                                    <span className="pill" style={{ background: scoreBg(rep.score), color: scoreColor(rep.score) }}>
                                        {rep.score}%
                                    </span>
                                </td>
                                <td className="font-mono text-[10px]">{rep.activity}</td>
                            </tr>
                        ))}
                        {mockReps.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-[rgb(var(--text-muted))]">
                                    No data yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
