import { describe, test, expect } from 'bun:test';
import { parseAuthorityMarkdown, type AuthorityRules } from '../../src/core/authority-enforcer';

const MOCK_AUTHORITY_MD = `
# Agent Authority — Detailed Rules

## Delegation Matrix

### @devops (Gage) — EXCLUSIVE Authority

| Operation | Exclusive? | Other Agents |
|-----------|-----------|--------------|
| \`git push\` | YES | BLOCKED |
| \`gh pr create\` | YES | BLOCKED |

### @pm (Morgan) — Epic Orchestration

| Operation | Exclusive? | Delegated From |
|-----------|-----------|---------------|
| \`*execute-epic\` | YES | — |
| \`*create-epic\` | YES | — |

### @sm (River) — Story Creation

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| \`*draft\` | YES | From epic/PRD |
| \`*create-story\` | YES | — |

### @dev (Dex) — Implementation

| Allowed | Blocked |
|---------|---------|
| \`git add\`, \`git commit\` | \`git push\` (delegate to @devops) |
| \`git branch\` | \`gh pr create\` (delegate to @devops) |

### @aios-master — Framework Governance

| Capability | Details |
|-----------|---------|
| Execute ANY task directly | No restrictions |
| Override agent boundaries | When necessary |
`;

// Mirror the matchOperation function for testing
function matchOperation(actual: string, pattern: string): boolean {
  const a = actual.toLowerCase().trim();
  const p = pattern.toLowerCase().trim();
  if (a === p) return true;
  if (a.startsWith(p) && (a.length === p.length || a[p.length] === ' ')) return true;
  if (p.startsWith(a) && (p.length === a.length || p[a.length] === ' ')) return true;
  return false;
}

describe('Authority Enforcer — matchOperation', () => {
  test('exact match', () => {
    expect(matchOperation('git push', 'git push')).toBe(true);
    expect(matchOperation('*execute-epic', '*execute-epic')).toBe(true);
  });

  test('actual has args, pattern is base command', () => {
    expect(matchOperation('git push --force', 'git push')).toBe(true);
    expect(matchOperation('git push origin main', 'git push')).toBe(true);
  });

  test('pattern has args, actual is base command', () => {
    expect(matchOperation('git push', 'git push --force')).toBe(true);
  });

  test('does NOT match partial substrings (the fix)', () => {
    // "execute" must NOT match "*execute-epic" — different commands
    expect(matchOperation('execute', '*execute-epic')).toBe(false);
    expect(matchOperation('execute', 'execute-epic')).toBe(false);
    // "create" must NOT match "*create-story"
    expect(matchOperation('create', '*create-story')).toBe(false);
  });

  test('unrelated operations do not match', () => {
    expect(matchOperation('execute', 'git push')).toBe(false);
    expect(matchOperation('deploy', 'git push')).toBe(false);
    expect(matchOperation('test', 'git push --force')).toBe(false);
  });
});

describe('Authority Enforcer — Parser', () => {
  let rules: AuthorityRules;

  test('parses markdown into rules', () => {
    rules = parseAuthorityMarkdown(MOCK_AUTHORITY_MD);
    expect(rules).toBeTruthy();
    expect(rules.exclusive).toBeInstanceOf(Map);
    expect(rules.blocked).toBeInstanceOf(Map);
    expect(rules.superuser).toBeInstanceOf(Set);
  });

  test('identifies exclusive agents', () => {
    expect(rules.exclusive.has('devops')).toBe(true);
    expect(rules.exclusive.has('pm')).toBe(true);
    expect(rules.exclusive.has('sm')).toBe(true);
  });

  test('devops has git push as exclusive', () => {
    const devopsOps = rules.exclusive.get('devops')!;
    const ops = devopsOps.map(o => o.operation);
    expect(ops).toContain('git push');
    expect(ops).toContain('gh pr create');
  });

  test('aios-master is superuser', () => {
    expect(rules.superuser.has('aios-master')).toBe(true);
  });

  test('generates wildcard blocks from exclusive rules', () => {
    const wildcardBlocks = rules.blocked.get('*');
    expect(wildcardBlocks).toBeTruthy();
    const blockedOps = wildcardBlocks!.map(b => b.operation);
    expect(blockedOps).toContain('git push');
  });

  test('dev has explicit blocks', () => {
    const devBlocks = rules.blocked.get('dev');
    expect(devBlocks).toBeTruthy();
    const ops = devBlocks!.map(b => b.operation);
    expect(ops.some(o => o.includes('git push'))).toBe(true);
  });

  test('dev blocks suggest devops', () => {
    const devBlocks = rules.blocked.get('dev')!;
    const pushBlock = devBlocks.find(b => b.operation.includes('git push'));
    expect(pushBlock?.suggestAgent).toBe('devops');
  });
});
