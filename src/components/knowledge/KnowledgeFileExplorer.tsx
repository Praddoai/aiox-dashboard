import {
  FolderOpen,
  FileText,
  File,
  ChevronRight,
  ChevronLeft,
  Home,
  RefreshCw,
} from 'lucide-react';
import { GlassCard, GlassButton } from '../ui';
import { cn } from '../../lib/utils';
import {
  useKnowledgeDirectory,
  formatFileSize,
  FILE_TYPE_COLORS,
  type KnowledgeFileItem,
} from '../../hooks/useKnowledge';

interface KnowledgeFileExplorerProps {
  currentPath: string;
  selectedFile: string | null;
  onNavigate: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export function KnowledgeFileExplorer({
  currentPath,
  selectedFile,
  onNavigate,
  onSelectFile,
}: KnowledgeFileExplorerProps) {
  const { data: directoryItems, isLoading, refetch } = useKnowledgeDirectory(currentPath);

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  const goHome = () => onNavigate('');

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    onNavigate(parts.join('/'));
  };

  const handleItemClick = (item: KnowledgeFileItem) => {
    if (item.type === 'directory') {
      onNavigate(currentPath ? `${currentPath}/${item.name}` : item.name);
    } else {
      onSelectFile(currentPath ? `${currentPath}/${item.name}` : item.name);
    }
  };

  return (
    <GlassCard className="flex flex-col h-full !p-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-glass-border">
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={goHome} aria-label="Inicio">
          <Home size={14} />
        </GlassButton>
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={goUp} disabled={!currentPath} aria-label="Voltar">
          <ChevronLeft size={14} />
        </GlassButton>
        <GlassButton variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} aria-label="Atualizar">
          <RefreshCw size={14} />
        </GlassButton>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 ml-2 text-xs text-tertiary overflow-x-auto flex-1 min-w-0">
          <button onClick={goHome} className="flex-shrink-0 hover:text-primary transition-colors">
            data
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1 min-w-0">
              <span>/</span>
              <button
                onClick={() => onNavigate(breadcrumbs.slice(0, idx + 1).join('/'))}
                className="truncate hover:text-primary transition-colors"
              >
                {crumb}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 glass-scrollbar">
        {isLoading ? (
          <div className="text-center py-8 text-tertiary text-sm">Carregando...</div>
        ) : !directoryItems?.length ? (
          <div className="text-center py-8 text-tertiary text-sm">Pasta vazia</div>
        ) : (
          directoryItems.map((item) => {
            const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            const isSelected = selectedFile === itemPath;

            return (
              <button
                key={item.name}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all group text-sm',
                  isSelected
                    ? 'glass-card border text-primary'
                    : 'hover:bg-white/5'
                )}
              >
                {item.type === 'directory' ? (
                  <>
                    <ChevronRight size={14} className="flex-shrink-0 text-tertiary" />
                    <FolderOpen size={16} className="flex-shrink-0 text-yellow-500" />
                  </>
                ) : (
                  <>
                    <span className="w-3.5 flex-shrink-0" />
                    <span className={FILE_TYPE_COLORS[item.extension || ''] || 'text-gray-400'}>
                      {item.extension === 'md' ? <FileText size={16} /> : <File size={16} />}
                    </span>
                  </>
                )}
                <span className="flex-1 truncate text-primary">{item.name}</span>
                {item.type === 'file' && (
                  <span className="text-[10px] text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatFileSize(item.size)}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
