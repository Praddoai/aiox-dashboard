'use client';

import { useMemo } from 'react';
import { Mermaid } from '@/components/mermaidcn/mermaid';
import { yamlToMermaid, extractWorkflowMeta, type WorkflowMeta } from '@/lib/yaml-to-mermaid';

interface WorkflowDiagramProps {
  yamlContent: string;
}

function AgentLegend({ agents }: { agents: WorkflowMeta['agents'] }) {
  if (agents.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-border">
      <span className="text-detail uppercase tracking-wider text-text-muted">Agents:</span>
      {agents.map(({ name, color }) => (
        <div key={name} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-label text-text-secondary">@{name}</span>
        </div>
      ))}
    </div>
  );
}

function WorkflowHeader({ meta }: { meta: WorkflowMeta }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-bg-elevated/30">
      <span className="text-sm text-text-primary font-medium">{meta.name}</span>
      {meta.version && (
        <span className="text-detail text-text-muted bg-bg-secondary px-1.5 py-0.5">
          v{meta.version}
        </span>
      )}
      {meta.phaseCount > 0 && (
        <span className="text-detail text-text-muted">
          {meta.phaseCount} phases
        </span>
      )}
    </div>
  );
}

export function WorkflowDiagram({ yamlContent }: WorkflowDiagramProps) {
  const { mermaidString, meta, conversionError } = useMemo(() => {
    try {
      const result = yamlToMermaid(yamlContent);
      const metaData = extractWorkflowMeta(yamlContent);
      return { mermaidString: result, meta: metaData, conversionError: null };
    } catch (err) {
      return {
        mermaidString: null,
        meta: null,
        conversionError: err instanceof Error ? err.message : 'Failed to convert workflow to diagram',
      };
    }
  }, [yamlContent]);

  if (conversionError) {
    return (
      <div className="space-y-3">
        <div className="border border-status-error/20 bg-status-error/5 p-3">
          <p className="text-label text-status-error">
            Failed to generate diagram: {conversionError}
          </p>
          <p className="text-detail text-text-secondary mt-1">
            Showing raw YAML below.
          </p>
        </div>
        <pre className="overflow-auto bg-bg-secondary p-4 text-label text-text-primary font-mono leading-relaxed">
          {yamlContent}
        </pre>
      </div>
    );
  }

  if (!mermaidString) return null;

  return (
    <div className="w-full border border-border bg-bg-secondary overflow-hidden">
      {meta && <WorkflowHeader meta={meta} />}

      <div className="w-full overflow-auto p-4 max-h-[600px]">
        <Mermaid
          chart={mermaidString}
          config={{
            theme: 'dark',
            flowchart: { htmlLabels: true, padding: 16 },
            fontSize: 13,
          }}
          debounceTime={100}
        />
      </div>

      {meta && <AgentLegend agents={meta.agents} />}
    </div>
  );
}
