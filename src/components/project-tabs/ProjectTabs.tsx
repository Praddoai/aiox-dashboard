import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X } from 'lucide-react';
import { ContextMenu } from '../ui';
import { useProjectStore, type Project } from '../../stores/projectStore';
import { cn } from '../../lib/utils';

export function ProjectTabs() {
  const { projects, activeProjectId, setActiveProject, removeProject, reorderProjects, addProject } = useProjectStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderProjects(oldIndex, newIndex);
    }
  };

  const handleAddProject = () => {
    const name = newName.trim();
    if (name) {
      addProject(name, `/${name}`);
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddProject();
    } else if (e.key === 'Escape') {
      setNewName('');
      setIsAdding(false);
    }
  };

  return (
    <div
      className={cn(
        'h-9 flex items-center gap-0',
        'glass-subtle border-b border-glass-border',
        'overflow-x-auto scrollbar-hidden'
      )}
      role="toolbar"
      aria-label="Project tabs"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={horizontalListSortingStrategy}
        >
          {projects.map((project) => (
            <SortableTab
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              canClose={projects.length > 1}
              onActivate={() => setActiveProject(project.id)}
              onClose={() => removeProject(project.id)}
              onCloseOthers={() => {
                // Remove all other projects
                projects.forEach((p) => {
                  if (p.id !== project.id) removeProject(p.id);
                });
                setActiveProject(project.id);
              }}
              totalTabs={projects.length}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add project */}
      {isAdding ? (
        <div className="flex items-center px-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            onBlur={() => {
              if (!newName.trim()) setIsAdding(false);
            }}
            autoFocus
            placeholder="project name"
            className="h-6 w-28 px-2 text-xs bg-white/5 border border-glass-border rounded text-primary placeholder:text-tertiary focus:outline-none focus:border-blue-500/50"
            aria-label="Nome do projeto"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex-shrink-0 h-9 w-8 flex items-center justify-center text-tertiary hover:text-secondary hover:bg-white/5 transition-colors"
          aria-label="Add project"
          title="Add project"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface SortableTabProps {
  project: Project;
  isActive: boolean;
  canClose: boolean;
  onActivate: () => void;
  onClose: () => void;
  onCloseOthers: () => void;
  totalTabs: number;
}

function SortableTab({
  project,
  isActive,
  canClose,
  onActivate,
  onClose,
  onCloseOthers,
  totalTabs,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contextMenuItems = [
    {
      label: 'Close',
      onClick: onClose,
      disabled: !canClose,
    },
    {
      label: 'Close Others',
      onClick: onCloseOthers,
      disabled: totalTabs <= 1,
    },
    {
      label: 'Close All',
      onClick: () => {}, // Disabled when only 1 tab
      disabled: totalTabs <= 1,
      separator: false,
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        role="presentation"
        className={cn(
          'group relative flex items-center h-9 text-xs',
          'transition-colors duration-150 select-none flex-shrink-0',
          'border-r border-glass-border',
          isDragging && 'opacity-50 z-10',
          isActive
            ? 'text-primary bg-white/5'
            : 'text-tertiary hover:text-secondary hover:bg-white/3'
        )}
      >
        {/* Tab name (interactive tab element) */}
        <span
          role="button"
          aria-pressed={isActive}
          tabIndex={0}
          onClick={onActivate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onActivate();
            }
          }}
          className="flex items-center gap-1.5 px-3 h-full cursor-pointer max-w-[120px] truncate font-medium"
        >
          {project.name}
        </span>

        {/* Close button */}
        {canClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              'flex-shrink-0 h-4 w-4 flex items-center justify-center rounded-sm mr-1',
              'text-tertiary hover:text-primary hover:bg-white/10 transition-colors',
              'opacity-0 group-hover:opacity-100',
              isActive && 'opacity-60'
            )}
            aria-label={`Close ${project.name}`}
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Active indicator (bottom border) */}
        {isActive && (
          <span
            className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-500 rounded-full"
            aria-hidden="true"
          />
        )}
      </div>
    </ContextMenu>
  );
}
