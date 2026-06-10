import { StatusDot } from '../ui';
import { useMonitorStore } from '../../stores/monitorStore';

export default function ConnectionStatus() {
  const connected = useMonitorStore((s) => s.connected);
  const mode = useMonitorStore((s) => s.connectionMode);

  const label = connected
    ? mode === 'engine' ? 'Engine' : mode === 'cloud' ? 'Cloud' : 'Connected'
    : 'Disconnected';

  return (
    <StatusDot
      status={connected ? 'working' : 'offline'}
      size="md"
      glow={connected}
      pulse={connected}
      label={label}
    />
  );
}
