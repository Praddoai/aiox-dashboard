import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  countSectionFilesRecursive,
  decodeSquadItemSlug,
  encodeSquadItemSlug,
  isListableSectionFile,
  isValidSquadSection,
  listSectionFilesRecursive,
  resolvePathWithin,
  resolveSquadSectionDir,
  sanitizeRelativePath,
} from '@/lib/squad-api-utils';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('squad-api-utils', () => {
  it('encodes and decodes nested relative paths', () => {
    const relativePath = 'tasks/weekly/review-task.md';
    const slug = encodeSquadItemSlug(relativePath);

    expect(slug).not.toBe('');
    expect(decodeSquadItemSlug(slug)).toBe(relativePath);
  });

  it('rejects invalid slug and traversal paths', () => {
    expect(decodeSquadItemSlug('not-base64###')).toBeNull();
    expect(sanitizeRelativePath('../outside.md')).toBeNull();
    expect(sanitizeRelativePath('/absolute.md')).toBe('absolute.md');
  });

  it('resolves safe path within base and blocks traversal', () => {
    const base = '/tmp/squad';

    const safe = resolvePathWithin(base, 'tasks/task.md');
    const unsafe = resolvePathWithin(base, '../../etc/passwd');

    expect(safe).toBe(path.resolve(base, 'tasks/task.md'));
    expect(unsafe).toBeNull();
  });

  it('validates sections and allowed file extensions', () => {
    expect(isValidSquadSection('workflows')).toBe(true);
    expect(isValidSquadSection('unknown')).toBe(false);

    expect(isListableSectionFile('workflows', 'flow.md')).toBe(true);
    expect(isListableSectionFile('workflows', 'flow.yaml')).toBe(true);
    expect(isListableSectionFile('workflows', 'flow.txt')).toBe(false);
    expect(isListableSectionFile('data', 'data.json')).toBe(true);
    expect(isListableSectionFile('data', 'data.txt')).toBe(false);
  });

  it('lists and counts recursive files by section rules', async () => {
    const sectionDir = await createTempDir('squad-api-utils-workflows-');
    await mkdir(path.join(sectionDir, 'nested'), { recursive: true });

    await writeFile(path.join(sectionDir, 'root.md'), '# root');
    await writeFile(path.join(sectionDir, 'nested', 'child.yaml'), 'steps: []');
    await writeFile(path.join(sectionDir, 'nested', 'ignored.txt'), 'x');

    const files = await listSectionFilesRecursive(sectionDir, 'workflows');
    const count = await countSectionFilesRecursive(sectionDir, 'workflows');

    expect(files).toEqual(['nested/child.yaml', 'root.md']);
    expect(count).toBe(2);
  });

  it('resolves squad section directory only for valid boundaries', () => {
    const projectRoot = '/tmp/project';

    const valid = resolveSquadSectionDir(projectRoot, 'copy', 'agents');
    const invalidSquad = resolveSquadSectionDir(projectRoot, '../copy', 'agents');
    const invalidSection = resolveSquadSectionDir(projectRoot, 'copy', 'secrets');

    expect(valid).toBe(path.resolve(projectRoot, 'squads', 'copy', 'agents'));
    expect(invalidSquad).toBeNull();
    expect(invalidSection).toBeNull();
  });
});
