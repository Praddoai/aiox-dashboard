import { useToastStore } from '../stores/toastStore';

type ExportFormat = 'json' | 'csv' | 'clipboard';

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExport() {
  const addToast = useToastStore((s) => s.addToast);

  const exportData = async (
    data: Record<string, unknown>[] | object,
    name: string,
    format: ExportFormat = 'json'
  ) => {
    try {
      if (format === 'clipboard') {
        const text = JSON.stringify(data, null, 2);
        await navigator.clipboard.writeText(text);
        addToast({ type: 'success', title: 'Copiado!', message: 'Dados copiados para o clipboard' });
        return;
      }

      const arr = Array.isArray(data) ? data : [data];
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `aios-${name}-${timestamp}`;

      if (format === 'csv') {
        downloadBlob(toCSV(arr), `${filename}.csv`, 'text/csv');
      } else {
        downloadBlob(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
      }

      addToast({ type: 'success', title: 'Exportado!', message: `${filename}.${format}` });
    } catch {
      addToast({ type: 'error', title: 'Erro ao exportar', message: 'Tente novamente' });
    }
  };

  const shareUrl = async (title?: string) => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || 'AIOS Platform', url });
        return;
      } catch { /* noop */ }
    }
    await navigator.clipboard.writeText(url);
    addToast({ type: 'success', title: 'Link copiado!', message: url });
  };

  return { exportData, shareUrl };
}
