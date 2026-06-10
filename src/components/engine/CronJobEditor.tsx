import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, GlassButton, GlassInput, GlassTextarea, useToast } from '../ui';
import { useCreateCron } from '../../hooks/useEngine';

interface CronJobEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCHEDULE_PRESETS = [
  { label: 'A cada 5 min', value: '*/5 * * * *' },
  { label: 'A cada 15 min', value: '*/15 * * * *' },
  { label: 'A cada hora', value: '0 * * * *' },
  { label: 'A cada 6h', value: '0 */6 * * *' },
  { label: 'Diário 9h', value: '0 9 * * *' },
  { label: 'Seg-Sex 9h', value: '0 9 * * 1-5' },
];

export default function CronJobEditor({ isOpen, onClose }: CronJobEditorProps) {
  const createCron = useCreateCron();
  const toast = useToast();

  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('0 * * * *');
  const [squadId, setSquadId] = useState('development');
  const [agentId, setAgentId] = useState('dev');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome obrigatório';
    if (!schedule.trim()) e.schedule = 'Schedule obrigatório';
    if (!squadId.trim()) e.squadId = 'Squad obrigatório';
    if (!agentId.trim()) e.agentId = 'Agent obrigatório';
    if (!message.trim()) e.message = 'Mensagem obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createCron.mutate(
      {
        name: name.trim(),
        schedule: schedule.trim(),
        squad_id: squadId.trim(),
        agent_id: agentId.trim(),
        message: message.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Cron criado', name.trim());
          resetForm();
          onClose();
        },
      },
    );
  }

  function resetForm() {
    setName('');
    setSchedule('0 * * * *');
    setSquadId('development');
    setAgentId('dev');
    setMessage('');
    setErrors({});
  }

  function handleClose() {
    resetForm();
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
        loading={createCron.isPending}
      >
        Criar Cron
      </GlassButton>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo Cron Job"
      description="Agendar execução recorrente de agente"
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        <GlassInput
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="daily-review, hourly-sync..."
        />

        <div>
          <label className="text-xs text-secondary mb-1.5 block">Schedule (cron expression)</label>
          <div className="flex gap-2">
            <input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="glass-input flex-1 h-11 px-4 rounded-xl text-sm bg-transparent font-mono"
              placeholder="*/5 * * * *"
            />
            <select
              onChange={(e) => { if (e.target.value) setSchedule(e.target.value); }}
              className="glass-input h-11 px-3 rounded-xl text-sm bg-transparent"
              defaultValue=""
            >
              <option value="" disabled>Presets</option>
              {SCHEDULE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {errors.schedule && (
            <p className="text-xs text-red-400 mt-1">{errors.schedule}</p>
          )}
        </div>

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
          placeholder="Tarefa que o agente deve executar a cada ciclo..."
          rows={3}
        />

        {createCron.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
            {(createCron.error as Error).message || 'Erro ao criar cron'}
          </div>
        )}
      </div>
    </Dialog>
  );
}
