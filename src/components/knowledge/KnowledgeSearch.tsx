import { useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '../../lib/utils';

interface KnowledgeSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  filterType: string | null;
  onFilterTypeChange: (type: string | null) => void;
  availableTypes: string[];
  onClear: () => void;
}

export function KnowledgeSearch({
  query,
  onQueryChange,
  filterType,
  onFilterTypeChange,
  availableTypes,
  onClear,
}: KnowledgeSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(value);
    }, 300);
  }, [onQueryChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar arquivos, agentes, pastas..."
          defaultValue={query}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            'w-full pl-9 pr-9 py-2 text-sm rounded-xl border transition-colors',
            'bg-white/5 border-glass-border',
            'text-primary placeholder:text-tertiary',
            'focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10'
          )}
        />
        {(query || filterType) && (
          <button
            onClick={() => {
              onClear();
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => onFilterTypeChange(filterType === type ? null : type)}
            >
              <Badge
                variant={filterType === type ? 'primary' : 'subtle'}
                size="sm"
                className="cursor-pointer"
              >
                .{type}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
