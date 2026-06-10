import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import KanbanBoard from '../kanban/KanbanBoard';
import { StoryList } from './StoryList';
import { cn } from '../../lib/utils';

type StoryViewMode = 'board' | 'list';

export default function StoryWorkspace() {
  const [viewMode, setViewMode] = useState<StoryViewMode>('board');

  const viewToggle = (
    <div className="flex items-center rounded-lg bg-white/5 p-0.5 gap-0.5">
      <button
        onClick={() => setViewMode('board')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'board'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Visualizar como board"
      >
        <LayoutGrid size={13} />
        <span className="hidden sm:inline">Board</span>
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
          viewMode === 'list'
            ? 'bg-white/10 text-primary shadow-sm'
            : 'text-tertiary hover:text-secondary'
        )}
        aria-label="Visualizar como lista"
      >
        <List size={13} />
        <span className="hidden sm:inline">Lista</span>
      </button>
    </div>
  );

  if (viewMode === 'board') {
    return <KanbanBoard viewToggle={viewToggle} />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6">
        <StoryList viewToggle={viewToggle} />
      </div>
    </div>
  );
}
