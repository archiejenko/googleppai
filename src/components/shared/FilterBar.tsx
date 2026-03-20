import { Search } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (v: string) => void;
  tags?: string[];
  activeTags?: string[];
  onTagToggle?: (tag: string) => void;
  className?: string;
}

export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  activeFilter,
  onFilterChange,
  tags,
  activeTags = [],
  onTagToggle,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Search */}
      {onSearchChange && (
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-os pl-10 py-2 text-sm w-full"
          />
        </div>
      )}

      {/* Tab Filters */}
      {filters && (
        <div className="flex items-center border border-[rgb(var(--border-default))]">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange?.(f.value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-150
                ${activeFilter === f.value
                  ? 'bg-[rgb(var(--accent-primary))] text-white'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-raised))]'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Tag chips */}
      {tags && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagToggle?.(tag)}
              className={`px-3 py-1 text-xs font-bold border transition-colors
                ${activeTags.includes(tag)
                  ? 'bg-[rgb(var(--accent-primary)/0.15)] border-[rgb(var(--accent-primary))] text-[rgb(var(--accent-primary))]'
                  : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--text-muted))]'
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
