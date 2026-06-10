'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Loader2 } from '@/lib/icons';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { useSquadItemContent } from '@/hooks/use-squads';

const WorkflowDiagram = dynamic(
  () => import('./WorkflowDiagram').then((m) => m.WorkflowDiagram),
  { ssr: false }
);

interface SquadItemViewerProps {
  squadName: string;
  section: string;
  slug: string;
  breadcrumb?: ReactNode;
}

export function SquadItemViewer({
  squadName,
  section,
  slug,
  breadcrumb,
}: SquadItemViewerProps) {
  const { item, isLoading, isError } = useSquadItemContent(squadName, section, slug);
  const [activeTab, setActiveTab] = useState<'diagram' | 'code'>('diagram');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-gold" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="p-6">
        {breadcrumb}
        <p className="text-label text-status-error">
          Failed to load item
        </p>
      </div>
    );
  }

  const isWorkflowYaml = section === 'workflows' && item.isYaml;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl">
        {/* Breadcrumb */}
        {breadcrumb}

        {/* Title */}
        <h2 className="text-base font-light text-text-primary mb-6">
          {item.title}
        </h2>

        {/* Workflow tabs */}
        {isWorkflowYaml && (
          <div className="flex items-center gap-1 mb-4 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('diagram')}
              className={cn(
                'px-3 py-2 text-detail uppercase tracking-wider font-medium',
                'border-b-2 -mb-px transition-colors',
                activeTab === 'diagram'
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              Diagram
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={cn(
                'px-3 py-2 text-detail uppercase tracking-wider font-medium',
                'border-b-2 -mb-px transition-colors',
                activeTab === 'code'
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              Code
            </button>
          </div>
        )}

        {/* Content */}
        {isWorkflowYaml ? (
          activeTab === 'diagram' ? (
            <WorkflowDiagram yamlContent={item.content} />
          ) : (
            <MarkdownRenderer
              content={`\`\`\`yaml\n${item.content}\n\`\`\``}
            />
          )
        ) : item.isYaml ? (
          <MarkdownRenderer
            content={`\`\`\`${item.filePath.endsWith('.json') ? 'json' : 'yaml'}\n${item.content}\n\`\`\``}
          />
        ) : (
          <MarkdownRenderer content={item.content} hideFirstH1 />
        )}
      </div>
    </div>
  );
}
