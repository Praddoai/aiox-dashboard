import { useState, useCallback } from 'react';
import { Dialog, GlassButton, GlassInput, GlassTextarea } from '../ui';
import type { Story, StoryStatus } from '../../stores/storyStore';
import { generateId } from '../../lib/utils';

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (story: Story) => void;
  defaultStatus?: StoryStatus;
}

const statusOptions: { value: StoryStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ai_review', label: 'AI Review' },
  { value: 'human_review', label: 'Human Review' },
  { value: 'pr_created', label: 'PR Created' },
  { value: 'done', label: 'Done' },
  { value: 'error', label: 'Error' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

const complexityOptions = [
  { value: 'simple', label: 'Simple' },
  { value: 'standard', label: 'Standard' },
  { value: 'complex', label: 'Complex' },
] as const;

const categoryOptions = [
  { value: 'feature', label: 'Feature' },
  { value: 'fix', label: 'Fix' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'docs', label: 'Docs' },
] as const;

const agentOptions = [
  { value: '', label: 'Unassigned' },
  { value: 'aios-dev', label: 'aios-dev' },
  { value: 'aios-qa', label: 'aios-qa' },
  { value: 'aios-architect', label: 'aios-architect' },
  { value: 'aios-pm', label: 'aios-pm' },
  { value: 'aios-devops', label: 'aios-devops' },
];

export function StoryCreateModal({
  isOpen,
  onClose,
  onSubmit,
  defaultStatus = 'backlog',
}: StoryCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<StoryStatus>(defaultStatus);
  const [priority, setPriority] = useState<Story['priority']>('medium');
  const [complexity, setComplexity] = useState<Story['complexity']>('standard');
  const [category, setCategory] = useState<Story['category']>('feature');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [acceptanceCriteriaText, setAcceptanceCriteriaText] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [titleError, setTitleError] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('medium');
    setComplexity('standard');
    setCategory('feature');
    setAssignedAgent('');
    setAcceptanceCriteriaText('');
    setTechnicalNotes('');
    setTitleError('');
  }, [defaultStatus]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    const acceptanceCriteria = acceptanceCriteriaText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const now = new Date().toISOString();

    const story: Story = {
      id: `story-${generateId()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      complexity,
      category,
      assignedAgent: assignedAgent || undefined,
      acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
      technicalNotes: technicalNotes.trim() || undefined,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    onSubmit(story);
    handleClose();
  }, [
    title,
    description,
    status,
    priority,
    complexity,
    category,
    assignedAgent,
    acceptanceCriteriaText,
    technicalNotes,
    onSubmit,
    handleClose,
  ]);

  const selectClasses =
    'glass-input w-full h-11 px-4 rounded-xl text-sm bg-transparent';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Story"
      size="xl"
      footer={
        <>
          <GlassButton variant="ghost" onClick={handleClose}>
            Cancel
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSubmit}>
            Create Story
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Title */}
        <GlassInput
          label="Title"
          placeholder="e.g. Implement SSE streaming for agent responses"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError('');
          }}
          error={titleError}
          required
        />

        {/* Description */}
        <GlassTextarea
          label="Description"
          placeholder="Describe the story in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
        />

        {/* Row: Status + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Status</label>
            <select
              className={selectClasses}
              value={status}
              onChange={(e) => setStatus(e.target.value as StoryStatus)}
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
              value={priority}
              onChange={(e) => setPriority(e.target.value as Story['priority'])}
              aria-label="Selecionar prioridade"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: Complexity + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Complexity</label>
            <select
              className={selectClasses}
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as Story['complexity'])}
              aria-label="Selecionar complexidade"
            >
              {complexityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Category</label>
            <select
              className={selectClasses}
              value={category}
              onChange={(e) => setCategory(e.target.value as Story['category'])}
              aria-label="Selecionar categoria"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assigned Agent */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">Assigned Agent</label>
          <select
            className={selectClasses}
            value={assignedAgent}
            onChange={(e) => setAssignedAgent(e.target.value)}
            aria-label="Selecionar agente"
          >
            {agentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Acceptance Criteria */}
        <GlassTextarea
          label="Acceptance Criteria"
          placeholder="One criterion per line..."
          hint="Each line becomes a separate criterion"
          value={acceptanceCriteriaText}
          onChange={(e) => setAcceptanceCriteriaText(e.target.value)}
          className="min-h-[80px]"
        />

        {/* Technical Notes */}
        <GlassTextarea
          label="Technical Notes"
          placeholder="Implementation hints, constraints, references..."
          value={technicalNotes}
          onChange={(e) => setTechnicalNotes(e.target.value)}
          className="min-h-[60px]"
        />
      </div>
    </Dialog>
  );
}
