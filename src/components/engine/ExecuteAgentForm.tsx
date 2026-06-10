import { useState } from 'react';
import { Play } from 'lucide-react';
import { Dialog, GlassButton, GlassInput, GlassTextarea, useToast } from '../ui';
import { useExecuteOnEngine } from '../../hooks/useEngine';

interface ExecuteAgentFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES = [
  { value: 0, label: 'P0 — Urgent' },
  { value: 1, label: 'P1 — High' },
  { value: 2, label: 'P2 — Normal' },
  { value: 3, label: 'P3 — Low' },
];

export default function ExecuteAgentForm({ isOpen, onClose }: ExecuteAgentFormProps) {
  const execute = useExecuteOnEngine();
  const toast = useToast();

  const [squadId, setSquadId] = useState('development');
  const [agentId, setAgentId] = useState('dev');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!squadId.trim()) e.squadId = 'Squad obrigatório';
    if (!agentId.trim()) e.agentId = 'Agent obrigatório';
    if (!message.trim()) e.message = 'Mensagem obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    execute.mutate(
      { squadId: squadId.trim(), agentId: agentId.trim(), message: message.trim(), priority },
      {
        onSuccess: () => {
          toast.success('Job submetido', `${agentId} @ ${squadId}`);
          setMessage('');
          onClose();
        },
      },
    );
  }

  function handleClose() {
    setErrors({});
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
        loading={execute.isPending}
      >
        Executar
      </GlassButton>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Executar Agente"
      description="Submeter job para o Engine"
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <GlassInput
            label="Squad ID"
            value={squadId}
            onChange={(e) => setSquadId(e.target.value)}
            error={errors.squadId}
            placeholder="development"
          />
          <GlassInput
            label="Agent ID"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            error={errors.agentId}
            placeholder="dev"
          />
        </div>

        <GlassTextarea
          label="Mensagem"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          error={errors.message}
          placeholder="Descreva a tarefa para o agente..."
          rows={4}
        />

        <div>
          <label className="text-xs text-secondary mb-1.5 block">Prioridade</label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="glass-input w-full h-11 px-4 rounded-xl text-sm bg-transparent"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {execute.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
            {(execute.error as Error).message || 'Erro ao executar agente'}
          </div>
        )}
      </div>
    </Dialog>
  );
}
