import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GlassCard, GlassButton, GlassInput } from '../ui';
import { useCategoryStore, type CategoryConfig } from '../../stores/categoryStore';
import { useSquads } from '../../hooks/useSquads';
import { useToast } from '../ui/Toast';
import { cn, getSquadTheme } from '../../lib/utils';
import { getIconComponent, ICON_SIZES } from '../../lib/icons';
import type { Squad, SquadType } from '../../types';

// Icons
const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="15" cy="5" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="19" r="1.5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={cn('transition-transform', expanded && 'rotate-90')}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const squadTypeOptions: { value: SquadType; label: string }[] = [
  { value: 'copywriting', label: 'Copywriting' },
  { value: 'design', label: 'Design' },
  { value: 'creator', label: 'Creator' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'content', label: 'Content' },
  { value: 'development', label: 'Development' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'advisory', label: 'Advisory' },
];

// Get category colors from centralized theme
const getCategoryColors = (squadType: SquadType): string => {
  const theme = getSquadTheme(squadType);
  return `${theme.borderSubtle} ${theme.bgSubtle}`;
};

export function CategoryManager() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    moveSquadToCategory,
    reorderSquadsInCategory,
    reorderCategories,
    getSquadCategory,
    resetToDefaults,
  } = useCategoryStore();

  const { data: squads = [] } = useSquads();
  const { success, error } = useToast();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '\u{1F4C2}',
    squadType: 'orchestrator' as SquadType,
  });

  // Get uncategorized squads
  const uncategorizedSquads = squads.filter((squad) => !getSquadCategory(squad.id));

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) {
      error('Erro', 'Nome da categoria é obrigatório');
      return;
    }

    const id = newCategory.name.toLowerCase().replace(/\s+/g, '-');
    addCategory({
      id,
      name: newCategory.name,
      icon: newCategory.icon,
      squadType: newCategory.squadType,
    });

    setNewCategory({ name: '', icon: 'FolderOpen', squadType: 'orchestrator' });
    setShowNewCategory(false);
    success('Categoria criada', `Categoria "${newCategory.name}" foi criada`);
  };

  const handleDeleteCategory = (category: CategoryConfig) => {
    if (category.squads.length > 0) {
      error('Erro', 'Remova todos os squads antes de excluir a categoria');
      return;
    }
    deleteCategory(category.id);
    success('Categoria excluída', `Categoria "${category.name}" foi removida`);
  };

  const handleDropSquad = (squadId: string, toCategoryId: string) => {
    const fromCategoryId = getSquadCategory(squadId);
    moveSquadToCategory(squadId, fromCategoryId, toCategoryId);
    success('Squad movido', `Squad movido para a categoria`);
  };

  const handleReorderCategories = (newOrder: CategoryConfig[]) => {
    reorderCategories(newOrder.map((c) => c.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">Organização de Categorias</h2>
            <p className="text-sm text-tertiary mt-1">
              Arraste para reorganizar categorias e squads
            </p>
          </div>
          <div className="flex gap-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => {
                resetToDefaults();
                success('Reset', 'Categorias restauradas para o padrão');
              }}
            >
              Resetar
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setShowNewCategory(true)}
            >
              <PlusIcon />
              <span className="ml-1">Nova Categoria</span>
            </GlassButton>
          </div>
        </div>

        {/* New Category Form */}
        <AnimatePresence>
          {showNewCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
                <h3 className="text-sm font-medium text-primary mb-3">Nova Categoria</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Icon</label>
                    <GlassInput
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                      placeholder="icon"
                      className="text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Nome</label>
                    <GlassInput
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="Nome da categoria"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-tertiary mb-1">Tipo</label>
                    <select
                      value={newCategory.squadType}
                      onChange={(e) => setNewCategory({ ...newCategory, squadType: e.target.value as SquadType })}
                      className="w-full p-2 rounded-lg glass-subtle text-primary bg-transparent border border-white/10 text-sm"
                    >
                      {squadTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <GlassButton variant="ghost" size="sm" onClick={() => setShowNewCategory(false)}>
                    <XIcon />
                    <span className="ml-1">Cancelar</span>
                  </GlassButton>
                  <GlassButton variant="primary" size="sm" onClick={handleCreateCategory}>
                    <CheckIcon />
                    <span className="ml-1">Criar</span>
                  </GlassButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories List */}
        <Reorder.Group
          axis="y"
          values={categories}
          onReorder={handleReorderCategories}
          className="space-y-2"
        >
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              squads={squads}
              isExpanded={expandedCategories.has(category.id)}
              isEditing={editingCategory === category.id}
              onToggle={() => toggleCategory(category.id)}
              onEdit={() => setEditingCategory(category.id)}
              onSave={(updates) => {
                updateCategory(category.id, updates);
                setEditingCategory(null);
                success('Salvo', 'Categoria atualizada');
              }}
              onCancelEdit={() => setEditingCategory(null)}
              onDelete={() => handleDeleteCategory(category)}
              onDropSquad={(squadId) => handleDropSquad(squadId, category.id)}
              onReorderSquads={(squadIds) => reorderSquadsInCategory(category.id, squadIds)}
            />
          ))}
        </Reorder.Group>
      </GlassCard>

      {/* Uncategorized Squads */}
      {uncategorizedSquads.length > 0 && (
        <GlassCard>
          <h3 className="text-sm font-medium text-primary mb-3">
            Squads sem Categoria ({uncategorizedSquads.length})
          </h3>
          <p className="text-xs text-tertiary mb-3">
            Arraste para uma categoria acima
          </p>
          <div className="flex flex-wrap gap-2">
            {uncategorizedSquads.map((squad) => (
              <motion.div
                key={squad.id}
                draggable
                onDragStart={((e: React.DragEvent<HTMLDivElement>) => {
                  e.dataTransfer.setData('squadId', squad.id);
                }) as unknown as (event: MouseEvent | TouchEvent | PointerEvent) => void}
                className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 text-sm text-primary cursor-grab hover:border-white/40 transition-colors"
              >
                {(() => { const Icon = getIconComponent(squad.icon || 'Package'); return <Icon size={14} className="inline-block mr-1" />; })()} {squad.name}
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// Category Item Component
interface CategoryItemProps {
  category: CategoryConfig;
  squads: Squad[];
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<CategoryConfig>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDropSquad: (squadId: string) => void;
  onReorderSquads: (squadIds: string[]) => void;
}

function CategoryItem({
  category,
  squads,
  isExpanded,
  isEditing,
  onToggle,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onDropSquad,
  onReorderSquads,
}: CategoryItemProps) {
  const [editForm, setEditForm] = useState({
    name: category.name,
    icon: category.icon,
    squadType: category.squadType,
  });

  const [isDragOver, setIsDragOver] = useState(false);

  const sortedSquads = category.squads
    .map((id) => squads.find((s) => s.id === id))
    .filter((s): s is Squad => Boolean(s));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const squadId = e.dataTransfer.getData('squadId');
    if (squadId) {
      onDropSquad(squadId);
    }
  };

  return (
    <Reorder.Item
      value={category}
      className={cn(
        'rounded-xl border transition-all',
        getCategoryColors(category.squadType),
        isDragOver && 'ring-2 ring-blue-500'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="cursor-grab text-white/30 hover:text-white/50">
          <GripIcon />
        </div>

        {isEditing ? (
          // Edit Mode
          <div className="flex-1 flex items-center gap-2">
            <GlassInput
              value={editForm.icon}
              onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
              className="w-12 text-center"
            />
            <GlassInput
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="flex-1"
            />
            <select
              value={editForm.squadType}
              onChange={(e) => setEditForm({ ...editForm, squadType: e.target.value as SquadType })}
              className="p-2 rounded-lg glass-subtle text-primary bg-transparent border border-white/10 text-sm"
            >
              {squadTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <GlassButton variant="ghost" size="icon" onClick={onCancelEdit} aria-label="Cancelar">
              <XIcon />
            </GlassButton>
            <GlassButton variant="primary" size="icon" onClick={() => onSave(editForm)} aria-label="Salvar">
              <CheckIcon />
            </GlassButton>
          </div>
        ) : (
          // View Mode
          <>
            <button
              onClick={onToggle}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <ChevronIcon expanded={isExpanded} />
              {(() => { const Icon = getIconComponent(category.icon); return <Icon size={ICON_SIZES.lg} />; })()}
              <span className="text-primary font-medium">{category.name}</span>
              <span className="text-xs text-tertiary">({category.squads.length})</span>
            </button>

            <div className="flex items-center gap-1">
              <GlassButton variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
                <EditIcon />
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-red-400 hover:bg-red-500/10"
                disabled={category.squads.length > 0}
                aria-label="Excluir"
              >
                <TrashIcon />
              </GlassButton>
            </div>
          </>
        )}
      </div>

      {/* Squads List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {sortedSquads.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={category.squads}
                  onReorder={onReorderSquads}
                  className="space-y-1"
                >
                  {sortedSquads.map((squad) => (
                    <Reorder.Item
                      key={squad.id}
                      value={squad.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-grab"
                    >
                      <div className="text-white/30">
                        <GripIcon />
                      </div>
                      <span className="text-base">{(() => { const Icon = getIconComponent(squad.icon || 'Package'); return <Icon size={16} />; })()}</span>
                      <span className="text-sm text-primary flex-1">{squad.name}</span>
                      <span className="text-xs text-tertiary">{squad.agentCount} agents</span>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <div className="text-center py-4 text-tertiary text-sm">
                  Arraste squads para cá
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}
