import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && (
        <div className="w-16 h-16 flex items-center justify-center border-2 border-[rgb(var(--border-default))] mb-6 bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-muted))]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-black text-[rgb(var(--text-primary))] mb-2 uppercase tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-[rgb(var(--text-muted))] max-w-xs">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-6 text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}
