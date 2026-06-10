import { useState, useCallback } from 'react';
import {
  Dialog,
  GlassButton,
  GlassInput,
  GlassTextarea,
  Badge,
  ProgressBar,
} from '../ui';
import {
  Pencil,
  Trash2,
  User,
  Calendar,
  FileText,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Story, StoryStatus } from '../../stores/storyStore';

interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story | null;
  onUpdate: (id: string, updates: Partial<Story>) => void;
  onDelete: (id: string) => void;
}

const statusLabels: Record<StoryStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  ai_review: 'AI Review',
  human_review: 'Human Review',
  pr_created: 'PR Created',
  done: 'Done',
  error: 'Error',
};

const statusColors: Record<StoryStatus, string> = {
  backlog: 'bg-gray-500/15 text-gray-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  ai_review: 'bg-purple-500/15 text-purple-400',
  human_review: 'bg-orange-500/15 text-orange-400',
  pr_created: 'bg-green-500/15 text-green-400',
  done: 'bg-emerald-500/15 text-emerald-400',
  error: 'bg-red-500/15 text-red-400',
};

const priorityColors: Record<Story['priority'], string> = {
  low: 'bg-gray-500/15 text-gray-400',
  medium: 'bg-blue-500/15 text-blue-400',
  high: 'bg-orange-500/15 text-orange-400',
  critical: 'bg-red-500/15 text-red-400',
};

const categoryColors: Record<Story['category'], string> = {
  feature: 'bg-blue-500/15 text-blue-400',
  fix: 'bg-red-500/15 text-red-400',
  refactor: 'bg-amber-500/15 text-amber-400',
  docs: 'bg-green-500/15 text-green-400',
};

const selectClasses =
  'glass-input w-full h-11 px-4 rounded-xl text-sm bg-transparent';

const statusOptions: { value: StoryStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ai_review', label: 'AI Review' },
  { value: 'human_review', label: 'Human Review' },
  { value: 'pr_created', label: 'PR Created' },
  { value: 'done', label: 'Done' },
  { value: 'error', label: 'Error' },
];

const priorityOptions = ['low', 'medium', 'high', 'critical'] as const;
const complexityOptions = ['simple', 'standard', 'complex'] as const;
const categoryOptionsList = ['feature', 'fix', 'refactor', 'docs'] as const;

const agentOptions = [
  { value: '', label: 'Unassigned' },
  { value: 'aios-dev', label: 'aios-dev' },
  { value: 'aios-qa', label: 'aios-qa' },
  { value: 'aios-architect', label: 'aios-architect' },
  { value: 'aios-pm', label: 'aios-pm' },
  { value: 'aios-devops', label: 'aios-devops' },
];

export function StoryDetailModal({
  isOpen,
  onClose,
  story,
  onUpdate,
  onDelete,
}: StoryDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<StoryStatus>('backlog');
  const [editPriority, setEditPriority] = useState<Story['priority']>('medium');
  const [editComplexity, setEditComplexity] = useState<Story['complexity']>('standard');
  const [editCategory, setEditCategory] = useState<Story['category']>('feature');
  const [editAgent, setEditAgent] = useState('');
  const [editAC, setEditAC] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const startEditing = useCallback(() => {
    if (!story) return;
    setEditTitle(story.title);
    setEditDescription(story.description ?? '');
    setEditStatus(story.status);
    setEditPriority(story.priority);
    setEditComplexity(story.complexity);
    setEditCategory(story.category);
    setEditAgent(story.assignedAgent ?? '');
    setEditAC((story.acceptanceCriteria ?? []).join('\n'));
    setEditNotes(story.technicalNotes ?? '');
    setIsEditing(true);
  }, [story]);

  const handleSave = useCallback(() => {
    if (!story || !editTitle.trim()) return;

    const acceptanceCriteria = editAC
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    onUpdate(story.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      status: editStatus,
      priority: editPriority,
      complexity: editComplexity,
      category: editCategory,
      assignedAgent: editAgent || undefined,
      acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
      technicalNotes: editNotes.trim() || undefined,
    });

    setIsEditing(false);
  }, [
    story,
    editTitle,
    editDescription,
    editStatus,
    editPriority,
    editComplexity,
    editCategory,
    editAgent,
    editAC,
    editNotes,
    onUpdate,
  ]);

  const handleDelete = useCallback(() => {
    if (!story) return;
    onDelete(story.id);
    setShowDeleteConfirm(false);
    onClose();
  }, [story, onDelete, onClose]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    onClose();
  }, [onClose]);

  if (!story) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Story' : story.title}
      size="xl"
      footer={
        isEditing ? (
          <>
            <GlassButton variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" onClick={handleSave}>
              Save Changes
            </GlassButton>
          </>
        ) : (
          <>
            {showDeleteConfirm ? (
              <>
                <span className="text-sm text-red-400 mr-2 flex items-center gap-1">
                  <AlertTriangle size={14} /> Confirm deletion?
                </span>
                <GlassButton variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </GlassButton>
                <GlassButton variant="danger" onClick={handleDelete}>
                  Delete
                </GlassButton>
              </>
            ) : (
              <>
                <GlassButton
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  leftIcon={<Trash2 size={14} />}
                >
                  Delete
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={startEditing}
                  leftIcon={<Pencil size={14} />}
                >
                  Edit
                </GlassButton>
              </>
            )}
          </>
        )
      }
    >
      {isEditing ? (
        <EditView
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          editStatus={editStatus}
          setEditStatus={setEditStatus}
          editPriority={editPriority}
          setEditPriority={setEditPriority}
          editComplexity={editComplexity}
          setEditComplexity={setEditComplexity}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          editAgent={editAgent}
          setEditAgent={setEditAgent}
          editAC={editAC}
          setEditAC={setEditAC}
          editNotes={editNotes}
          setEditNotes={setEditNotes}
        />
      ) : (
        <ReadView story={story} formatDate={formatDate} />
      )}
    </Dialog>
  );
}

// --- Read-only view ---

function ReadView({
  story,
  formatDate,
}: {
  story: Story;
  formatDate: (d: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            statusColors[story.status]
          )}
        >
          {statusLabels[story.status]}
        </span>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
            priorityColors[story.priority]
          )}
        >
          {story.priority}
        </span>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
            categoryColors[story.category]
          )}
        >
          {story.category}
        </span>
        <Badge size="sm" className="capitalize">
          {story.complexity}
        </Badge>
        {story.bobOrchestrated && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/15 text-purple-400">
            <Zap size={12} className="mr-1" />
            Bob Orchestrated
          </span>
        )}
      </div>

      {/* Description */}
      {story.description && (
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
            Description
          </h3>
          <p className="text-sm text-primary leading-relaxed">{story.description}</p>
        </div>
      )}

      {/* Progress */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
          Progress
        </h3>
        <ProgressBar
          value={story.progress}
          size="md"
          variant={
            story.progress >= 100
              ? 'success'
              : story.progress >= 60
                ? 'info'
                : 'default'
          }
          showLabel
          glow={story.progress >= 100}
        />
      </div>

      {/* Acceptance Criteria */}
      {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Acceptance Criteria
          </h3>
          <ul className="flex flex-col gap-1.5">
            {story.acceptanceCriteria.map((ac, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-primary">
                <CheckCircle2 size={14} className="text-tertiary mt-0.5 flex-shrink-0" />
                <span>{ac}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Notes */}
      {story.technicalNotes && (
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
            Technical Notes
          </h3>
          <p className="text-sm text-secondary leading-relaxed font-mono bg-white/5 p-3 rounded-lg">
            {story.technicalNotes}
          </p>
        </div>
      )}

      {/* Metadata row */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-glass-border">
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <User size={12} />
          <span>{story.assignedAgent ?? 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <FileText size={12} />
          <span className="font-mono">{story.id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <Calendar size={12} />
          <span>Created {formatDate(story.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <Calendar size={12} />
          <span>Updated {formatDate(story.updatedAt)}</span>
        </div>
        {story.filePath && (
          <div className="col-span-2 flex items-center gap-2 text-xs text-tertiary">
            <FileText size={12} />
            <span className="font-mono">{story.filePath}</span>
          </div>
        )}
        {story.epicId && (
          <div className="col-span-2 flex items-center gap-2 text-xs text-tertiary">
            <Zap size={12} />
            <span className="font-mono">Epic: {story.epicId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Edit view ---

interface EditViewProps {
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editStatus: StoryStatus;
  setEditStatus: (v: StoryStatus) => void;
  editPriority: Story['priority'];
  setEditPriority: (v: Story['priority']) => void;
  editComplexity: Story['complexity'];
  setEditComplexity: (v: Story['complexity']) => void;
  editCategory: Story['category'];
  setEditCategory: (v: Story['category']) => void;
  editAgent: string;
  setEditAgent: (v: string) => void;
  editAC: string;
  setEditAC: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
}

function EditView({
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  editPriority,
  setEditPriority,
  editComplexity,
  setEditComplexity,
  editCategory,
  setEditCategory,
  editAgent,
  setEditAgent,
  editAC,
  setEditAC,
  editNotes,
  setEditNotes,
}: EditViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <GlassInput
        label="Title"
        value={editTitle}
        onChange={(e) => setEditTitle(e.target.value)}
        required
      />

      <GlassTextarea
        label="Description"
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        className="min-h-[80px]"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">Status</label>
          <select
            className={selectClasses}
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as StoryStatus)}
            aria-label="Selecionar status"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">Priority</label>
          <select
            className={selectClasses}
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as Story['priority'])}
            aria-label="Selecionar prioridade"
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">Complexity</label>
          <select
            className={selectClasses}
            value={editComplexity}
            onChange={(e) => setEditComplexity(e.target.value as Story['complexity'])}
            aria-label="Selecionar complexidade"
          >
            {complexityOptions.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">Category</label>
          <select
            className={selectClasses}
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as Story['category'])}
            aria-label="Selecionar categoria"
          >
            {categoryOptionsList.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-secondary">Assigned Agent</label>
        <select
          className={selectClasses}
          value={editAgent}
          onChange={(e) => setEditAgent(e.target.value)}
          aria-label="Selecionar agente"
        >
          {agentOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <GlassTextarea
        label="Acceptance Criteria"
        value={editAC}
        onChange={(e) => setEditAC(e.target.value)}
        hint="One criterion per line"
        className="min-h-[80px]"
      />

      <GlassTextarea
        label="Technical Notes"
        value={editNotes}
        onChange={(e) => setEditNotes(e.target.value)}
        className="min-h-[60px]"
      />
    </div>
  );
}
