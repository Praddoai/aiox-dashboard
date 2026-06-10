import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExecutionLogPanel } from './ExecutionLogPanel';
import { useExecutionLogStore } from '../../stores/executionLogStore';

/**
 * Wrapper that populates the execution log store with mock data.
 */
function WithMockLogs({ isExecuting = false }: { isExecuting?: boolean }) {
  const { addLog, clearLogs } = useExecutionLogStore();

  useEffect(() => {
    clearLogs();

    // Add sample logs
    addLog({ level: 'info', message: 'Iniciando pipeline: @sm -> @dev -> @qa' });
    addLog({ level: 'agent', message: 'River iniciando...', agentName: 'River', step: 1, totalSteps: 3 });
    addLog({ level: 'success', message: 'River concluido', agentName: 'River', step: 1, totalSteps: 3, duration: 2.3 });
    addLog({ level: 'agent', message: 'Dex iniciando...', agentName: 'Dex', step: 2, totalSteps: 3 });
    addLog({ level: 'tool', message: '[tool] file_write executado', toolName: 'file_write' });
    addLog({ level: 'tool', message: '[tool] bash executado', toolName: 'bash' });

    if (isExecuting) {
      useExecutionLogStore.setState({
        isExecuting: true,
        currentExecution: {
          id: 'exec-1',
          startTime: new Date(),
          command: '*develop-story 2.3',
          pipelineAgents: ['River', 'Dex', 'Quinn'],
          currentStep: 2,
          totalSteps: 3,
        },
      });
    } else {
      addLog({ level: 'success', message: 'Dex concluido', agentName: 'Dex', step: 2, totalSteps: 3, duration: 12.5 });
      addLog({ level: 'success', message: 'Execucao concluida com sucesso', duration: 14.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ExecutionLogPanel />;
}

function WithErrorLogs() {
  const { addLog, clearLogs } = useExecutionLogStore();

  useEffect(() => {
    clearLogs();
    addLog({ level: 'info', message: 'Iniciando execucao...' });
    addLog({ level: 'agent', message: 'Dex iniciando...', agentName: 'Dex', step: 1, totalSteps: 1 });
    addLog({ level: 'tool', message: '[tool] bash executado', toolName: 'bash' });
    addLog({ level: 'error', message: '[tool] file_write falhou: ENOENT: no such file', toolName: 'file_write' });
    addLog({ level: 'warning', message: 'Retrying with alternative path...' });
    addLog({ level: 'error', message: 'Execucao falhou', details: { code: 'ENOENT', path: '/missing/file.ts' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ExecutionLogPanel />;
}

const meta: Meta<typeof ExecutionLogPanel> = {
  title: 'Layout/ExecutionLogPanel',
  component: ExecutionLogPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Expandable panel that shows detailed execution logs including pipeline progress, agent steps, tool usage, errors, and timing information.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS class names',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', overflow: 'auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const CompletedExecution: Story = {
  render: () => <WithMockLogs isExecuting={false} />,
};

export const ActiveExecution: Story = {
  render: () => <WithMockLogs isExecuting />,
};

export const WithErrors: Story = {
  render: () => <WithErrorLogs />,
};

export const Empty: Story = {
  render: () => {
    useExecutionLogStore.getState().clearLogs();
    return <ExecutionLogPanel />;
  },
};
