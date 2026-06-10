import { useState } from 'react';
import { Search, Plus, Database, Star } from 'lucide-react';
import { GlassCard, GlassButton, GlassInput, GlassTextarea, Badge, Dialog } from '../ui';
import { cn } from '../../lib/utils';
import { useRecallMemory, useStoreMemory } from '../../hooks/useEngine';

export default function MemoryBrowser() {
  const [scope, setScope] = useState('global');
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStoreForm, setShowStoreForm] = useState(false);

  const { data, isLoading, isFetching } = useRecallMemory(scope, searchQuery, 10);

  function handleSearch() {
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  }

  const scopes = ['global', 'development', 'orchestrator', 'design', 'analytics', 'content'];

  return (
    <div className="space-y-4">
      {/* Scope selector */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {scopes.map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md transition-all',
              scope === s
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-tertiary hover:text-secondary hover:bg-white/5',
            )}
          >
            {s}
          </button>
        ))}
        <GlassButton
          size="sm"
          variant="ghost"
          leftIcon={<Plus className="h-3 w-3" />}
          onClick={() => setShowStoreForm(true)}
          className="ml-auto"
        >
          Armazenar
        </GlassButton>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1">
          <GlassInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar memórias..."
            leftIcon={<Search className="h-4 w-4" />}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <GlassButton
          variant="primary"
          onClick={handleSearch}
          loading={isFetching}
        >
          Buscar
        </GlassButton>
      </div>

      {/* Results */}
      {!searchQuery ? (
        <div className="text-tertiary text-sm p-8 text-center">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Digite uma query para buscar memórias no scope "{scope}"
        </div>
      ) : isLoading ? (
        <div className="text-secondary text-sm p-4">Buscando memórias...</div>
      ) : !data?.memories.length ? (
        <div className="text-tertiary text-sm p-8 text-center">
          Nenhuma memória encontrada para "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-2">
          {data.memories.map((mem) => (
            <GlassCard key={mem.id} padding="md" variant="subtle">
              <div className="flex items-start gap-3">
                <Database className="h-3.5 w-3.5 mt-1 text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary whitespace-pre-wrap break-words">
                    {mem.content}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-[10px] text-tertiary">{mem.id.slice(0, 12)}...</code>
                    {mem.score !== undefined && (
                      <Badge variant="default" className="text-[10px]">
                        <Star className="h-2.5 w-2.5 mr-0.5 inline" />
                        {(mem.score * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Store memory form */}
      <StoreMemoryDialog
        isOpen={showStoreForm}
        onClose={() => setShowStoreForm(false)}
        defaultScope={scope}
      />
    </div>
  );
}

function StoreMemoryDialog({
  isOpen,
  onClose,
  defaultScope,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultScope: string;
}) {
  const storeMemory = useStoreMemory();
  const [scope, setScope] = useState(defaultScope);
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit() {
    const e: Record<string, string> = {};
    if (!scope.trim()) e.scope = 'Scope obrigatório';
    if (!content.trim()) e.content = 'Conteúdo obrigatório';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    storeMemory.mutate(
      { scope: scope.trim(), content: content.trim() },
      {
        onSuccess: () => {
          setContent('');
          onClose();
        },
      },
    );
  }

  function handleClose() {
    setErrors({});
    setContent('');
    onClose();
  }

  const footer = (
    <>
      <GlassButton variant="ghost" onClick={handleClose}>
        Cancelar
      </GlassButton>
      <GlassButton
        variant="primary"
        leftIcon={<Plus className="h-3.5 w-3.5" />}
        onClick={handleSubmit}
        loading={storeMemory.isPending}
      >
        Armazenar
      </GlassButton>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Armazenar Memória"
      description="Salvar informação na memória do engine"
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        <GlassInput
          label="Scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          error={errors.scope}
          placeholder="global, development, ..."
        />
        <GlassTextarea
          label="Conteúdo"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          error={errors.content}
          placeholder="Informação a ser armazenada..."
          rows={5}
        />
        {storeMemory.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
            {(storeMemory.error as Error).message || 'Erro ao armazenar memória'}
          </div>
        )}
      </div>
    </Dialog>
  );
}
