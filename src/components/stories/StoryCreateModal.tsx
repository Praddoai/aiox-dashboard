import { useState, useCallback } from 'react';
import { Dialog, GlassButton, GlassInput, GlassTextarea } from '../ui';
import { generateId } from '../../lib/utils';
import { useStoryStore } from '../../stores/storyStore';
import type { StoryStatus, Story, StoryState, StoryActions } from '../../stores/storyStore';

type StoryStore = StoryState & StoryActions;

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: StoryStatus;
}

const selectClasses =
  'glass-input w-full h-11 px-4 rounded-xl appearance-none bg-transparent text-sm text-primary cursor-pointer';

export function StoryCreateModal({ isOpen, onClose, defaultStatus = 'backlog' }: StoryCreateModalProps) {
  const addStory = useStoryStore((s: StoryStore) => s.addStory);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<StoryStatus>(defaultStatus);
  const [priority, setPriority] = useState<Story['priority']>('medium');
  const [complexity, setComplexity] = useState<Story['complexity']>('standard');
  const [category, setCategory] = useState<Story['category']>('feature');
  const [epicId, setEpicId] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setStatus(defaultStatus);
    setPriority('medium');
    setComplexity('standard');
    setCategory('feature');
    setEpicId('');
    setAcceptanceCriteria('');
    setTechnicalNotes('');
    setTitleError('');
    setLoading(false);
  }, [defaultStatus]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setTitleError('Titulo e obrigatorio');
      return;
    }

    setLoading(true);

    const now = new Date().toISOString();
    const criteria = acceptanceCriteria
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const story: Story = {
      id: generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      complexity,
      category,
      epicId: epicId.trim() || undefined,
      acceptanceCriteria: criteria.length > 0 ? criteria : undefined,
      technicalNotes: technicalNotes.trim() || undefined,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Simulate a small delay for UX feedback
    await new Promise((r) => setTimeout(r, 300));

    addStory(story);
    setLoading(false);
    handleClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Criar Story"
      size="lg"
      footer={
        <>
          <GlassButton variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            Criar
          </GlassButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <GlassInput
          label="Titulo"
          required
          placeholder="Titulo da story"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError('');
          }}
          error={titleError}
        />

        {/* Description */}
        <GlassTextarea
          label="Descricao"
          placeholder="Descreva a story..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Selects row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Status</label>
            <select
              className={selectClasses}
              value={status}
              onChange={(e) => setStatus(e.target.value as StoryStatus)}
              aria-label="Selecionar status"
            >
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="ai_review">AI Review</option>
              <option value="human_review">Human Review</option>
              <option value="pr_created">PR Created</option>
              <option value="done">Done</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Prioridade</label>
            <select
              className={selectClasses}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Story['priority'])}
              aria-label="Selecionar prioridade"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Complexity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Complexidade</label>
            <select
              className={selectClasses}
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as Story['complexity'])}
              aria-label="Selecionar complexidade"
            >
              <option value="simple">Simple</option>
              <option value="standard">Standard</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Categoria</label>
            <select
              className={selectClasses}
              value={category}
              onChange={(e) => setCategory(e.target.value as Story['category'])}
              aria-label="Selecionar categoria"
            >
              <option value="feature">Feature</option>
              <option value="fix">Fix</option>
              <option value="refactor">Refactor</option>
              <option value="docs">Docs</option>
            </select>
          </div>
        </div>

        {/* Epic ID */}
        <GlassInput
          label="Epic ID"
          placeholder="Ex: EPIC-2"
          value={epicId}
          onChange={(e) => setEpicId(e.target.value)}
        />

        {/* Acceptance Criteria */}
        <GlassTextarea
          label="Criterios de Aceitacao"
          placeholder="Um criterio por linha..."
          hint="Insira cada criterio em uma nova linha"
          value={acceptanceCriteria}
          onChange={(e) => setAcceptanceCriteria(e.target.value)}
        />

        {/* Technical Notes */}
        <GlassTextarea
          label="Notas Tecnicas"
          placeholder="Notas tecnicas opcionais..."
          value={technicalNotes}
          onChange={(e) => setTechnicalNotes(e.target.value)}
        />
      </form>
    </Dialog>
  );
}
