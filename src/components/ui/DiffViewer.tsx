import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewerProps {
  fileName: string;
  language?: string;
  oldContent?: string;
  newContent?: string;
  diffLines?: DiffLine[];
  maxHeight?: number;
  collapsed?: boolean;
}

// Parse unified diff text into structured lines
function parseDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = buildLCS(oldLines, newLines);
  let oi = 0;
  let ni = 0;
  let li = 0;
  let oldNum = 1;
  let newNum = 1;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length && oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      result.push({ type: 'context', content: oldLines[oi], oldLineNumber: oldNum++, newLineNumber: newNum++ });
      oi++;
      ni++;
      li++;
    } else if (oi < oldLines.length && (li >= lcs.length || oldLines[oi] !== lcs[li])) {
      result.push({ type: 'removed', content: oldLines[oi], oldLineNumber: oldNum++ });
      oi++;
    } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
      result.push({ type: 'added', content: newLines[ni], newLineNumber: newNum++ });
      ni++;
    } else {
      break;
    }
  }

  return result;
}

// Simplified LCS for diff computation
function buildLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // For very large files, use a simpler approach
  if (m * n > 100000) {
    return a.filter((line) => b.includes(line));
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

// Count changes
function countChanges(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.type === 'added') added++;
    if (line.type === 'removed') removed++;
  }
  return { added, removed };
}

export function DiffViewer({
  fileName,
  oldContent,
  newContent,
  diffLines: externalDiffLines,
  maxHeight = 400,
  collapsed: initialCollapsed = false,
}: DiffViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const lines = useMemo(() => {
    if (externalDiffLines) return externalDiffLines;
    if (oldContent !== undefined && newContent !== undefined) {
      return parseDiff(oldContent, newContent);
    }
    return [];
  }, [externalDiffLines, oldContent, newContent]);

  const { added, removed } = useMemo(() => countChanges(lines), [lines]);

  // File extension for icon
  const ext = fileName.split('.').pop() || '';
  const fileIcon = ext === 'tsx' || ext === 'ts' ? 'TS' : ext === 'css' ? 'CSS' : ext === 'json' ? '{}' : ext.toUpperCase().slice(0, 3);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--glass-border-color, rgba(255,255,255,0.08))',
        background: 'var(--color-background-raised, rgba(0,0,0,0.4))',
      }}
    >
      {/* File header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
        style={{
          borderBottom: isCollapsed ? 'none' : '1px solid var(--glass-border-color, rgba(255,255,255,0.06))',
        }}
      >
        {/* Expand/collapse chevron */}
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-tertiary flex-shrink-0"
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>

        {/* File type badge */}
        <span
          className="flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-mono font-bold"
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'rgb(129, 140, 248)',
          }}
        >
          {fileIcon}
        </span>

        {/* File name */}
        <span className="text-xs font-mono text-primary truncate flex-1">{fileName}</span>

        {/* Change stats */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {added > 0 && (
            <span className="text-[10px] font-mono font-bold" style={{ color: '#4ade80' }}>
              +{added}
            </span>
          )}
          {removed > 0 && (
            <span className="text-[10px] font-mono font-bold" style={{ color: '#f87171' }}>
              -{removed}
            </span>
          )}
        </div>
      </button>

      {/* Diff content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="overflow-y-auto font-mono text-[11px] leading-[18px]"
              style={{ maxHeight }}
            >
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    line.type === 'added' && 'bg-emerald-500/10',
                    line.type === 'removed' && 'bg-red-500/10',
                  )}
                >
                  {/* Line numbers */}
                  <span
                    className="flex-shrink-0 w-[36px] text-right pr-2 select-none"
                    style={{
                      color: 'var(--color-text-quaternary, rgba(255,255,255,0.2))',
                      borderRight: '1px solid var(--glass-border-color, rgba(255,255,255,0.06))',
                    }}
                  >
                    {line.oldLineNumber || ''}
                  </span>
                  <span
                    className="flex-shrink-0 w-[36px] text-right pr-2 select-none"
                    style={{
                      color: 'var(--color-text-quaternary, rgba(255,255,255,0.2))',
                      borderRight: '1px solid var(--glass-border-color, rgba(255,255,255,0.06))',
                    }}
                  >
                    {line.newLineNumber || ''}
                  </span>

                  {/* Change indicator */}
                  <span
                    className="flex-shrink-0 w-[16px] text-center select-none font-bold"
                    style={{
                      color:
                        line.type === 'added'
                          ? '#4ade80'
                          : line.type === 'removed'
                            ? '#f87171'
                            : 'transparent',
                    }}
                  >
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>

                  {/* Code content */}
                  <pre
                    className="flex-1 px-2 whitespace-pre overflow-x-auto"
                    style={{
                      color:
                        line.type === 'added'
                          ? '#86efac'
                          : line.type === 'removed'
                            ? '#fca5a5'
                            : 'var(--color-text-secondary)',
                    }}
                  >
                    {line.content || ' '}
                  </pre>
                </div>
              ))}

              {lines.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-tertiary">
                  No changes
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// File tree showing changed files
interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

interface FileTreeProps {
  files: FileChange[];
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
}

const statusColors: Record<FileChange['status'], string> = {
  added: '#4ade80',
  modified: '#fbbf24',
  deleted: '#f87171',
};

const statusLabels: Record<FileChange['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
};

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--glass-border-color, rgba(255,255,255,0.08))',
        background: 'var(--color-background-raised, rgba(0,0,0,0.4))',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: '1px solid var(--glass-border-color, rgba(255,255,255,0.06))',
        }}
      >
        <span className="text-xs font-semibold text-primary">
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span style={{ color: '#4ade80' }}>+{totalAdditions}</span>
          <span style={{ color: '#f87171' }}>-{totalDeletions}</span>
        </div>
      </div>

      {/* File list */}
      <div className="max-h-[300px] overflow-y-auto">
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelectFile?.(file.path)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors',
              selectedFile === file.path && 'bg-white/8',
            )}
          >
            {/* Status badge */}
            <span
              className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
              style={{
                backgroundColor: statusColors[file.status] + '22',
                color: statusColors[file.status],
              }}
            >
              {statusLabels[file.status]}
            </span>

            {/* File path */}
            <span className="text-[11px] font-mono text-secondary truncate flex-1">
              {file.path}
            </span>

            {/* Change stats bar */}
            <div className="flex-shrink-0 flex gap-px h-2">
              {Array.from({ length: Math.min(file.additions, 5) }).map((_, i) => (
                <div key={`a-${i}`} className="w-1 h-full rounded-sm" style={{ background: '#4ade80' }} />
              ))}
              {Array.from({ length: Math.min(file.deletions, 5) }).map((_, i) => (
                <div key={`d-${i}`} className="w-1 h-full rounded-sm" style={{ background: '#f87171' }} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
