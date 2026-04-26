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
      {onSearchChange && (
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-os pl-9 py-1.5 text-xs w-full"
          />
        </div>
      )}

      {filters && (
        <div className="flex items-center gap-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange?.(f.value)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors duration-150
                ${activeFilter === f.value
                  ? 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {tags && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagToggle?.(tag)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-colors
                ${activeTags.includes(tag)
                  ? 'bg-[rgba(255,107,107,0.12)] border-[rgba(255,107,107,0.3)] text-[#FF6B6B]'
                  : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--border-subtle))]'
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
