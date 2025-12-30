import { MessageSquareQuote } from 'lucide-react';

export default function CoachNotes() {
    return (
        <div className="card-os p-6 h-full flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 text-[rgb(var(--text-primary))]">
                <MessageSquareQuote className="w-5 h-5 text-[rgb(var(--accent-primary))]" />
                <h3 className="text-lg font-display font-bold">Coach's Notes</h3>
            </div>

            <div className="bg-[rgb(var(--bg-canvas))] p-4 rounded-lg border border-[rgb(var(--border-subtle))] mb-4 flex-1">
                <p className="text-[rgb(var(--text-secondary))] text-sm leading-relaxed italic">
                    "Great energy on the opening, but remember to pause after the value proposition. You're rushing the discovery phase—ask open-ended questions before pitching the solution."
                </p>
                <div className="mt-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Coach" alt="Coach" />
                    </div>
                    <span className="text-xs text-[rgb(var(--text-muted))] font-medium">Sarah (Sales Manager)</span>
                </div>
            </div>

            <button className="w-full py-2 text-sm text-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-primary)/0.1)] rounded-md hover:bg-[rgb(var(--accent-primary)/0.2)] transition-colors">
                Reply to Feedback
            </button>
        </div>
    );
}
