import { useState } from 'react';
import { Play } from 'lucide-react';
import { Dialog, GlassButton, GlassInput, GlassTextarea, useToast } from '../ui';
import { useStartWorkflow } from '../../hooks/useEngine';
import type { WorkflowDef } from '../../services/api/engine';

interface WorkflowTriggerModalProps {
  workflow: WorkflowDef | null;
  onClose: () => void;
}

export default function WorkflowTriggerModal({ workflow, onClose }: WorkflowTriggerModalProps) {
  const startWorkflow = useStartWorkflow();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [parentJobId, setParentJobId] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!workflow) return;
    if (!message.trim()) {
      setError('Mensagem obrigatória');
      return;
    }
    setError('');
    startWorkflow.mutate(
      {
        workflowId: workflow.id,
        input: { message: message.trim() },
        parentJobId: parentJobId.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Workflow iniciado', workflow.name);
          setMessage('');
          setParentJobId('');
          onClose();
        },
      },
    );
  }

  function handleClose() {
    setError('');
    setMessage('');
    setParentJobId('');
    onClose();
  }

  const footer = (
    <>
      <GlassButton variant="ghost" onClick={handleClose}>
        Cancelar
      </GlassButton>
      <GlassButton
        variant="primary"
        leftIcon={<Play className="h-3.5 w-3.5" />}
        onClick={handleSubmit}
        loading={startWorkflow.isPending}
      >
        Iniciar Workflow
      </GlassButton>
    </>
  );

  return (
    <Dialog
      isOpen={!!workflow}
      onClose={handleClose}
      title={`Iniciar: ${workflow?.name || ''}`}
      description={`${workflow?.phases || 0} fases • ${workflow?.id || ''}`}
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        <GlassTextarea
          label="Mensagem / Input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          error={error}
          placeholder="Descreva o que o workflow deve processar..."
          rows={4}
        />

        <GlassInput
          label="Parent Job ID (opcional)"
          value={parentJobId}
          onChange={(e) => setParentJobId(e.target.value)}
          placeholder="ID de um job pai, se aplicável"
          hint="Vincular a um job existente"
        />

        {startWorkflow.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
            {(startWorkflow.error as Error).message || 'Erro ao iniciar workflow'}
          </div>
        )}
      </div>
    </Dialog>
  );
}
