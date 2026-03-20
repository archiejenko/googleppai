

const mockReps = [
    { id: 1, name: "Sarah Connor", risk: "High", metric: "Objection Handling", score: 42, activity: "2d ago" },
    { id: 2, name: "John Wick", risk: "Medium", metric: "Closing", score: 68, activity: "5h ago" },
    { id: 3, name: "Ellen Ripley", risk: "Low", metric: "Discovery", score: 85, activity: "1h ago" },
];

export default function RepsAtRiskTable() {
    return (
        <div className="card-os p-0 h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[rgb(var(--border-subtle))] flex justify-between items-center">
                <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">
                    Focus Areas
                </h3>
                <button className="text-xs text-[rgb(var(--accent-primary))] hover:underline font-medium">View All</button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[rgb(var(--bg-canvas)/0.5)] text-[rgb(var(--text-muted))]">
                        <tr>
                            <th className="px-6 py-3 font-medium">Rep Name</th>
                            <th className="px-6 py-3 font-medium">Metric Gap</th>
                            <th className="px-6 py-3 font-medium">Score</th>
                            <th className="px-6 py-3 font-medium">Last Active</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                        {mockReps.map((rep) => (
                            <tr key={rep.id} className="hover:bg-[rgb(var(--bg-surface-raised))] transition-colors group">
                                <td className="px-6 py-4 font-medium text-[rgb(var(--text-primary))] flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${rep.risk === 'High' ? 'bg-status-danger' : rep.risk === 'Medium' ? 'bg-status-warning' : 'bg-status-success'}`} />
                                    {rep.name}
                                </td>
                                <td className="px-6 py-4 text-[rgb(var(--text-secondary))]">
                                    {rep.metric}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 w-16 h-1.5 bg-[rgb(var(--bg-canvas))] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${rep.score < 50 ? 'bg-status-danger' : rep.score < 70 ? 'bg-status-warning' : 'bg-status-success'}`}
                                                style={{ width: `${rep.score}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-[rgb(var(--text-muted))]">{rep.score}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[rgb(var(--text-muted))]">
                                    {rep.activity}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
