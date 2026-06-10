// Taxonomia fixa de dominios — source of truth para o AIOS Dashboard
// NUNCA adicionar domains ad-hoc; novos squads devem caber nas 6 categorias.

export const DOMAIN_TAXONOMY = {
  strategy:   { label: 'Strategy',            color: 'var(--agent-pm)',        bg: 'var(--agent-pm-bg)',        border: 'var(--agent-pm-border)' },
  marketing:  { label: 'Marketing & Content', color: 'var(--agent-po)',        bg: 'var(--agent-po-bg)',        border: 'var(--agent-po-border)' },
  technical:  { label: 'Technical',           color: 'var(--agent-dev)',       bg: 'var(--agent-dev-bg)',       border: 'var(--agent-dev-border)' },
  operations: { label: 'Operations',          color: 'var(--agent-analyst)',   bg: 'var(--agent-analyst-bg)',   border: 'var(--agent-analyst-border)' },
  brand:      { label: 'Brand & Design',      color: 'var(--agent-devops)',    bg: 'var(--agent-devops-bg)',    border: 'var(--agent-devops-border)' },
  meta:       { label: 'Meta & Frameworks',   color: 'var(--agent-architect)', bg: 'var(--agent-architect-bg)', border: 'var(--agent-architect-border)' },
} as const;

export type DomainKey = keyof typeof DOMAIN_TAXONOMY;

export const DOMAIN_ORDER: DomainKey[] = [
  'strategy',
  'marketing',
  'technical',
  'operations',
  'brand',
  'meta',
];

// Maps legacy/ad-hoc domain names to canonical domain keys
const LEGACY_DOMAIN_MAP: Record<string, DomainKey> = {
  business_strategy: 'strategy',
  business_ops: 'operations',
  content_marketing: 'marketing',
  technical: 'technical',
  meta_frameworks: 'meta',
  brand: 'brand',
  franchise: 'operations',
  movimento: 'marketing',
  'marketing-ideologico': 'marketing',
  'design-system': 'brand',
};

// Per-squad overrides when default domain mapping doesn't apply
const SQUAD_DOMAIN_OVERRIDES: Record<string, DomainKey> = {
  'aiox-workspace': 'strategy',
  'data': 'technical',
  'spy': 'marketing',
  'design': 'brand',
  'deep-research': 'technical',
};

export function resolveSquadDomain(squadName: string, rawDomain: string): DomainKey {
  if (squadName in SQUAD_DOMAIN_OVERRIDES) {
    return SQUAD_DOMAIN_OVERRIDES[squadName];
  }
  if (rawDomain in LEGACY_DOMAIN_MAP) {
    return LEGACY_DOMAIN_MAP[rawDomain];
  }
  if (rawDomain in DOMAIN_TAXONOMY) {
    return rawDomain as DomainKey;
  }
  return 'meta';
}

export function getDomainColor(domain: string): string {
  const entry = DOMAIN_TAXONOMY[domain as DomainKey];
  return entry ? entry.color : 'var(--text-muted)';
}

export function getDomainBg(domain: string): string {
  const entry = DOMAIN_TAXONOMY[domain as DomainKey];
  return entry ? entry.bg : 'transparent';
}

export function getDomainBorder(domain: string): string {
  const entry = DOMAIN_TAXONOMY[domain as DomainKey];
  return entry ? entry.border : 'var(--border)';
}

export function getDomainLabel(domain: string): string {
  const entry = DOMAIN_TAXONOMY[domain as DomainKey];
  return entry ? entry.label : domain.replace(/[-_]/g, ' ');
}
