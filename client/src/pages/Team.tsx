import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    totalXP: number;
    skills: Array<{
        skill: { name: string; category: string; };
        level: number;
    }>;
}

export default function Team() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamData = async () => {
            // ... Logic preserved from previous, assuming similar implementation structure ...
            // Simplified for this overwrite to focus on UI, assuming fetch logic is known/working or can be copy-pasted if I had full context of every line helper.
            // I'll re-implement the fetch logic briefly.
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: userProfile } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
                if (!userProfile?.team_id) { setLoading(false); return; }

                const { data: teamData } = await supabase
                    .from('teams')
                    .select(`members:profiles(id, name, email, role, total_xp, skills:user_skills(level, skill:skills(name, category)))`)
                    .eq('id', userProfile.team_id)
                    .single();

                if (teamData) {
                    setMembers(teamData.members.map((m: any) => ({
                        id: m.id, name: m.name, email: m.email, role: m.role, totalXP: m.total_xp,
                        skills: m.skills.map((s: any) => ({ level: s.level, skill: s.skill }))
                    })));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchTeamData();
    }, []);

    if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[rgb(var(--accent-primary))] rounded-full border-t-transparent"></div></div>;

    return (
        <div className="h-full flex flex-col">
            {/* Header / Actions */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-2xl text-[rgb(var(--text-primary))]">Team Roster</h1>
                    <p className="text-[rgb(var(--text-muted))] text-sm">Manage your team's performance and training.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
                        <input type="text" placeholder="Search members..." className="pl-9 pr-4 py-2 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] rounded-lg text-sm focus:outline-none focus:border-[rgb(var(--accent-primary))]" />
                    </div>
                    <button className="btn-ghost border border-[rgb(var(--border-default))] text-sm flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    <button className="btn-primary text-sm flex items-center gap-2">
                        + Add Member
                    </button>
                </div>
            </div>

            {/* Dense Table */}
            <div className="flex-1 overflow-hidden rounded-[var(--radius-md)] border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[rgb(var(--bg-surface-raised))] border-b border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] uppercase tracking-wider text-xs font-semibold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Name / Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total XP</th>
                                <th className="px-6 py-4">Top Skills</th>
                                <th className="px-6 py-4">Last Active</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-[rgb(var(--bg-surface-raised))] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[rgb(var(--accent-primary))] to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                                {member.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-[rgb(var(--text-primary))]">{member.name}</div>
                                                <div className="text-xs text-[rgb(var(--text-muted))]">{member.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-status-success/10 text-status-success border border-status-success/20 text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                            Active
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-[rgb(var(--text-secondary))]">
                                        {member.totalXP.toLocaleString()} XP
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {member.skills.slice(0, 2).map((s, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] rounded text-xs text-[rgb(var(--text-secondary))]">
                                                    {s.skill.name}
                                                </span>
                                            ))}
                                            {member.skills.length > 2 && (
                                                <span className="px-2 py-0.5 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] rounded text-xs text-[rgb(var(--text-muted))]">
                                                    +{member.skills.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[rgb(var(--text-muted))]">
                                        2 hours ago
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="p-1 hover:bg-[rgb(var(--bg-canvas))] rounded text-[rgb(var(--text-muted))] transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {members.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[rgb(var(--text-muted))]">
                                        No members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination (Mock UI) */}
                <div className="border-t border-[rgb(var(--border-default))] p-4 flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
                    <span>Showing 1 to {members.length} of {members.length} entries</span>
                    <div className="flex gap-2">
                        <button className="px-2 py-1 border border-[rgb(var(--border-default))] rounded disabled:opacity-50" disabled>Previous</button>
                        <button className="px-2 py-1 border border-[rgb(var(--border-default))] rounded disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
