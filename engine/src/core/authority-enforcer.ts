import { readFileSync, existsSync } from 'fs';
import { log } from '../lib/logger';
import { rulesPath } from '../lib/config';
import type { EngineConfig } from '../types';

// ============================================================
// Authority Enforcer — Story 3.2
// Parses agent-authority.md and enforces permission rules
// ============================================================

let config: EngineConfig;
let rules: AuthorityRules | null = null;

export interface AuthorityRules {
  exclusive: Map<string, ExclusiveRule[]>;   // agentId -> exclusive operations
  blocked: Map<string, BlockedRule[]>;       // agentId -> blocked operations
  superuser: Set<string>;                    // agents with no restrictions
}

interface ExclusiveRule {
  operation: string;
  agentId: string;
}

interface BlockedRule {
  operation: string;
  suggestAgent: string;
}

export interface AuthorityCheck {
  allowed: boolean;
  reason?: string;
  suggestAgent?: string;
}

interface AuditEntry {
  timestamp: string;
  agentId: string;
  squadId: string;
  operation: string;
  allowed: boolean;
  reason?: string;
}

const auditLog: AuditEntry[] = [];
const MAX_AUDIT_SIZE = 1000;

export function initAuthorityEnforcer(cfg: EngineConfig): void {
  config = cfg;
  loadRules();
}

export function canExecute(agentId: string, operation: string, squadId: string): AuthorityCheck {
  // Override for test environments
  if ((config as unknown as { authority?: { override?: boolean } }).authority?.override === true) {
    return audit(agentId, squadId, operation, { allowed: true, reason: 'override enabled' });
  }

  if (!rules) {
    loadRules();
  }

  if (!rules) {
    // No rules file found — permissive mode
    return audit(agentId, squadId, operation, { allowed: true, reason: 'no rules loaded' });
  }

  const normalizedAgent = normalizeAgentId(agentId);

  // Superusers bypass all checks
  if (rules.superuser.has(normalizedAgent)) {
    return audit(agentId, squadId, operation, { allowed: true, reason: 'superuser' });
  }

  // Check if operation is exclusive to another agent
  for (const [exclusiveAgent, exclusiveOps] of rules.exclusive) {
    for (const rule of exclusiveOps) {
      if (matchOperation(operation, rule.operation)) {
        if (normalizedAgent !== exclusiveAgent) {
          return audit(agentId, squadId, operation, {
            allowed: false,
            reason: `Operation "${operation}" is exclusive to @${exclusiveAgent}`,
            suggestAgent: exclusiveAgent,
          });
        }
      }
    }
  }

  // Check if agent has explicit blocks
  const agentBlocks = rules.blocked.get(normalizedAgent);
  if (agentBlocks) {
    for (const block of agentBlocks) {
      if (matchOperation(operation, block.operation)) {
        return audit(agentId, squadId, operation, {
          allowed: false,
          reason: `Agent @${agentId} is blocked from "${operation}"`,
          suggestAgent: block.suggestAgent,
        });
      }
    }
  }

  return audit(agentId, squadId, operation, { allowed: true });
}

export function getAuditLog(limit = 50): AuditEntry[] {
  return auditLog.slice(-limit);
}

export function reloadRules(): void {
  rules = null;
  loadRules();
}

// -- Internal --

function audit(agentId: string, squadId: string, operation: string, result: AuthorityCheck): AuthorityCheck {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    agentId,
    squadId,
    operation,
    allowed: result.allowed,
    reason: result.reason,
  };

  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_SIZE);
  }

  if (!result.allowed) {
    log.warn('Authority check BLOCKED', {
      agentId,
      squadId,
      operation,
      reason: result.reason,
      suggestAgent: result.suggestAgent,
    });
  } else {
    log.debug('Authority check passed', { agentId, squadId, operation });
  }

  return result;
}

function normalizeAgentId(id: string): string {
  return id.replace(/^@/, '').toLowerCase().trim();
}

function matchOperation(actual: string, pattern: string): boolean {
  const a = actual.toLowerCase().trim();
  const p = pattern.toLowerCase().trim();

  // Direct match
  if (a === p) return true;

  // Command + arguments: "git push --force" matches pattern "git push"
  // Only match on word boundary (space separator), not partial substrings
  if (a.startsWith(p) && (a.length === p.length || a[p.length] === ' ')) return true;

  // Reverse: pattern "git push --force" matches actual "git push"
  if (p.startsWith(a) && (p.length === a.length || p[a.length] === ' ')) return true;

  return false;
}

function loadRules(): void {
  const possiblePaths = [
    rulesPath('agent-authority.md'),
  ];

  let content: string | null = null;
  let loadedPath: string | null = null;

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      content = readFileSync(p, 'utf-8');
      loadedPath = p;
      break;
    }
  }

  if (!content) {
    log.warn('agent-authority.md not found, running in permissive mode');
    return;
  }

  rules = parseAuthorityMarkdown(content);
  log.info('Authority rules loaded', {
    path: loadedPath,
    exclusiveAgents: rules.exclusive.size,
    blockedAgents: rules.blocked.size,
    superusers: rules.superuser.size,
  });
}

export function parseAuthorityMarkdown(content: string): AuthorityRules {
  const exclusive = new Map<string, ExclusiveRule[]>();
  const blocked = new Map<string, BlockedRule[]>();
  const superuser = new Set<string>();

  const sections = content.split(/###\s+/);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;

    const header = lines[0].trim();

    // Extract agent ID from header like "@devops (Gage) — EXCLUSIVE Authority"
    const agentMatch = header.match(/@(\w[\w-]*)/);
    if (!agentMatch) continue;

    const agentId = agentMatch[1].toLowerCase();

    // Check for superuser (aios-master)
    if (agentId === 'aios-master') {
      // Parse capabilities
      const hasUnlimited = section.toLowerCase().includes('execute any task') ||
                           section.toLowerCase().includes('no restrictions');
      if (hasUnlimited) {
        superuser.add(agentId);
      }
      continue;
    }

    // Parse table rows for operations
    const tableRows = lines.filter(l => l.trim().startsWith('|') && !l.includes('---'));

    for (const row of tableRows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;

      const operation = cells[0].replace(/`/g, '').trim();
      if (!operation || operation === 'Operation' || operation === 'Allowed' ||
          operation === 'Owns' || operation === 'Capability') continue;

      // Check if operation is exclusive
      const isExclusive = cells.some(c =>
        c.toUpperCase() === 'YES' || header.toUpperCase().includes('EXCLUSIVE')
      );

      // Check "Blocked" column or "Other Agents" = BLOCKED
      const _isBlocked = cells.some(c => c.toUpperCase() === 'BLOCKED');

      if (isExclusive) {
        const existing = exclusive.get(agentId) || [];
        existing.push({ operation, agentId });
        exclusive.set(agentId, existing);
      }

      // For the @dev section which has Allowed|Blocked columns
      // Use word boundary check to avoid matching @devops
      if (agentId === 'dev') {
        parseDevSection(lines, blocked, exclusive);
        break; // Only parse once
      }
    }
  }

  // Build blocked rules from exclusive rules:
  // If devops exclusively owns "git push", all OTHER agents are blocked from it
  for (const [exclusiveAgent, ops] of exclusive) {
    for (const op of ops) {
      // Mark all non-exclusive agents as blocked from this operation
      // We store this as a general block that canExecute checks
      // The blocked map key is "*" meaning "any non-exclusive agent"
      const existing = blocked.get('*') || [];
      existing.push({
        operation: op.operation,
        suggestAgent: exclusiveAgent,
      });
      blocked.set('*', existing);
    }
  }

  return { exclusive, blocked, superuser };
}

function parseDevSection(lines: string[], blocked: Map<string, BlockedRule[]>, _exclusive: Map<string, ExclusiveRule[]>): void {
  const blockedOps: BlockedRule[] = [];

  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    // "Blocked" column
    if (cells[0] === 'Blocked' || cells[0] === 'Allowed') continue;

    // In the dev table, second column is "Blocked"
    // Check if the row has both allowed and blocked
    const _allowedCol = cells[0];
    const blockedCol = cells[1];

    if (blockedCol && !blockedCol.includes('---')) {
      const ops = blockedCol.replace(/`/g, '').split(',').map(o => o.trim());
      for (const op of ops) {
        if (!op) continue;
        // Extract suggestion from parentheses: "git push (delegate to @devops)"
        const suggestMatch = op.match(/delegate to @(\w+)/i);
        const cleanOp = op.replace(/\(.*?\)/g, '').trim();
        if (cleanOp) {
          blockedOps.push({
            operation: cleanOp,
            suggestAgent: suggestMatch?.[1] || 'devops',
          });
        }
      }
    }
  }

  if (blockedOps.length > 0) {
    blocked.set('dev', blockedOps);
  }
}
