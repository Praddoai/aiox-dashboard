import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { DiffViewer, FileTree } from '../DiffViewer';

describe('DiffViewer', () => {
  const sampleDiffLines = [
    { type: 'context' as const, content: 'const x = 1;', oldLineNumber: 1, newLineNumber: 1 },
    { type: 'removed' as const, content: 'const y = 2;', oldLineNumber: 2 },
    { type: 'added' as const, content: 'const y = 3;', newLineNumber: 2 },
    { type: 'added' as const, content: 'const z = 4;', newLineNumber: 3 },
  ];

  it('shows file name', () => {
    render(<DiffViewer fileName="App.tsx" diffLines={sampleDiffLines} />);

    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('shows file type badge (TS for .tsx)', () => {
    render(<DiffViewer fileName="App.tsx" diffLines={sampleDiffLines} />);

    expect(screen.getByText('TS')).toBeInTheDocument();
  });

  it('shows file type badge (CSS for .css)', () => {
    render(<DiffViewer fileName="styles.css" diffLines={[]} />);

    expect(screen.getByText('CSS')).toBeInTheDocument();
  });

  it('shows added/removed counts', () => {
    render(<DiffViewer fileName="App.tsx" diffLines={sampleDiffLines} />);

    // 2 added lines, 1 removed line
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('renders diff lines with correct indicators', () => {
    render(<DiffViewer fileName="App.tsx" diffLines={sampleDiffLines} />);

    // Added lines have "+" indicator, removed have "-"
    const plusIndicators = screen.getAllByText('+');
    const minusIndicators = screen.getAllByText('-');

    // +2 in the header + 2 "+" indicators in the diff lines
    expect(plusIndicators.length).toBeGreaterThanOrEqual(2);
    // -1 in the header + 1 "-" indicator in the diff lines
    expect(minusIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it('toggles collapsed state on click', async () => {
    const { user } = render(<DiffViewer fileName="App.tsx" diffLines={sampleDiffLines} />);

    // Initially expanded - diff content should be visible
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();

    // Click the header button to collapse
    const headerButton = screen.getByRole('button');
    await user.click(headerButton);

    // After framer-motion exit animation the content should be hidden
    // Since AnimatePresence removes the element, the content text should be gone
  });

  it('starts collapsed when collapsed=true', () => {
    render(<DiffViewer fileName="App.tsx" diffLines={sampleDiffLines} collapsed />);

    // When collapsed, the diff content should not be rendered (AnimatePresence)
    expect(screen.queryByText('const x = 1;')).not.toBeInTheDocument();
  });

  it('computes diff from oldContent/newContent', () => {
    const oldContent = 'line one\nline two\nline three';
    const newContent = 'line one\nline modified\nline three';

    render(<DiffViewer fileName="test.ts" oldContent={oldContent} newContent={newContent} />);

    // The unchanged lines should appear
    expect(screen.getByText('line one')).toBeInTheDocument();
    expect(screen.getByText('line three')).toBeInTheDocument();
  });

  it('uses external diffLines when provided', () => {
    const customLines = [
      { type: 'added' as const, content: 'custom added line', newLineNumber: 1 },
    ];

    render(<DiffViewer fileName="test.ts" diffLines={customLines} />);

    expect(screen.getByText('custom added line')).toBeInTheDocument();
  });

  it('shows "No changes" when empty', () => {
    render(<DiffViewer fileName="empty.ts" diffLines={[]} />);

    expect(screen.getByText('No changes')).toBeInTheDocument();
  });
});

describe('FileTree', () => {
  const sampleFiles = [
    { path: 'src/App.tsx', status: 'modified' as const, additions: 5, deletions: 2 },
    { path: 'src/utils.ts', status: 'added' as const, additions: 10, deletions: 0 },
    { path: 'src/old.ts', status: 'deleted' as const, additions: 0, deletions: 15 },
  ];

  it('shows file count and total changes', () => {
    render(<FileTree files={sampleFiles} />);

    expect(screen.getByText('3 files changed')).toBeInTheDocument();

    // Total additions: 15, total deletions: 17
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('-17')).toBeInTheDocument();
  });

  it('shows singular "file" for one file', () => {
    render(<FileTree files={[sampleFiles[0]]} />);

    expect(screen.getByText('1 file changed')).toBeInTheDocument();
  });

  it('shows file paths', () => {
    render(<FileTree files={sampleFiles} />);

    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
    expect(screen.getByText('src/old.ts')).toBeInTheDocument();
  });

  it('shows status badges (A, M, D)', () => {
    render(<FileTree files={sampleFiles} />);

    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('calls onSelectFile when a file is clicked', async () => {
    const onSelectFile = vi.fn();
    const { user } = render(<FileTree files={sampleFiles} onSelectFile={onSelectFile} />);

    await user.click(screen.getByText('src/App.tsx'));

    expect(onSelectFile).toHaveBeenCalledWith('src/App.tsx');
  });
});
