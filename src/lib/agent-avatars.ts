/**
 * Agent Avatar Resolution
 *
 * Maps agent names/IDs to their generated avatar images.
 * Falls back gracefully when no avatar exists for an agent.
 */

// Known agent avatar mappings (agent-id → filename)
const AVATAR_MAP: Record<string, string> = {
  // Core AIOS agents (brandbook codenames)
  'architect': 'architect.png',
  'aria': 'architect.png',
  'analyst': 'analyst.png',
  'atlas': 'analyst.png',
  'squad-creator': 'squad-creator.png',
  'craft': 'squad-creator.png',
  'data-engineer': 'data-engineer.png',
  'dara': 'data-engineer.png',
  'dev': 'dev.png',
  'dex': 'dev.png',
  'devops': 'devops.png',
  'gage': 'devops.png',
  'pm': 'pm.png',
  'morgan': 'pm.png',
  'aios-master': 'aios-master.png',
  'orion': 'aios-master.png',
  'po': 'po.png',
  'pax': 'po.png',
  'qa': 'qa.png',
  'quinn': 'qa.png',
  'sm': 'sm.png',
  'river': 'sm.png',
  'ux-design-expert': 'ux-design-expert.png',
  'uma': 'ux-design-expert.png',

  // Clone agents (real people)
  'alan-nicolas': 'alan-nicolas.png',
  'oalanicolas': 'alan-nicolas.png',
  'pedro-valerio': 'pedro-valerio.png',
  'pedrovalerio': 'pedro-valerio.png',
  'thiago-finch': 'thiago-finch.png',
  'thiagofinch': 'thiago-finch.png',
  'frank-kern': 'frank-kern.png',
  'frankkern': 'frank-kern.png',

  // Design squad agents (clones)
  'brad-frost': 'brad-frost.png',
  'bradfrost': 'brad-frost.png',
  'dan-mall': 'dan-mall.png',
  'danmall': 'dan-mall.png',
  'dave-malouf': 'dave-malouf.png',
  'davemalouf': 'dave-malouf.png',

  // Design squad agents (AI)
  'design-chief': 'design-chief.png',
  'ds-token-architect': 'ds-token-architect.png',
  'ds-foundations-lead': 'ds-foundations-lead.png',
  'storybook-expert': 'storybook-expert.png',
  'nano-banana-generator': 'nano-banana-generator.png',

  // Squad-creator-pro agents
  'squad-chief': 'squad-chief.png',

  // aios-development extended agents
  'aios-helper': 'aios-helper.png',
  'briefing-backlog': 'briefing-backlog.png',
  'funnelytics-expert': 'funnelytics-expert.png',
  'hotmart-expert': 'hotmart-expert.png',
  'knowledge-creator': 'knowledge-creator.png',
  'n8n-expert': 'n8n-expert.png',
  'orquestrador-global': 'orquestrador-global.png',
  'sendflow-expert': 'sendflow-expert.png',
  'tag-manager-expert': 'tag-manager-expert.png',
  'waha-expert': 'waha-expert.png',

  // Academic research squad
  'academic-research': 'academic-research.png',
  'academic-writer': 'academic-writer.png',
  'citation-manager': 'citation-manager.png',
  'literature-reviewer': 'literature-reviewer.png',
  'peer-reviewer': 'peer-reviewer.png',
  'research-chief': 'research-chief.png',

  // Agora direct response squad
  'agora-chief': 'agora-chief.png',
  'agora-growth-advisor': 'agora-growth-advisor.png',
  'agora-idea-architect': 'agora-idea-architect.png',
  'agora-launch-master': 'agora-launch-master.png',
  'agora-offer-designer': 'agora-offer-designer.png',
  'agora-sales-engineer': 'agora-sales-engineer.png',
  'agora-strategist': 'agora-strategist.png',

  // AIOS core dev squad
  'aios-core-chief': 'aios-core-chief.png',
  'api-architect': 'api-architect.png',
  'dev-planner': 'dev-planner.png',
  'integration-specialist': 'integration-specialist.png',
  'orchestration-expert': 'orchestration-expert.png',

  // ASMR shorts squad
  'ai-producer': 'ai-producer.png',
  'algorithm-decoder': 'algorithm-decoder.png',
  'analytics-pulse': 'analytics-pulse.png',
  'asmr-scriptwriter': 'asmr-scriptwriter.png',
  'growth-engine': 'growth-engine.png',
  'metadata-pro': 'metadata-pro.png',
  'scheduler': 'scheduler.png',
  'shorts-chief': 'shorts-chief.png',
  'thumb-creator': 'thumb-creator.png',
  'trend-hunter': 'trend-hunter.png',

  // Copywriting squad agents
  'david-ogilvy': 'david-ogilvy.png',
  'davidogilvy': 'david-ogilvy.png',
  'gary-halbert': 'gary-halbert.png',
  'garyhalbert': 'gary-halbert.png',
  'eugene-schwartz': 'eugene-schwartz.png',
  'eugeneschwartz': 'eugene-schwartz.png',
  'dan-kennedy': 'dan-kennedy.png',
  'dankennedy': 'dan-kennedy.png',
  'claude-hopkins': 'claude-hopkins.png',
  'claudehopkins': 'claude-hopkins.png',
  'clayton-makepeace': 'clayton-makepeace.png',
  'claytonmakepeace': 'clayton-makepeace.png',
  'gary-bencivenga': 'gary-bencivenga.png',
  'garybencivenga': 'gary-bencivenga.png',
  'joe-sugarman': 'joe-sugarman.png',
  'joesugarman': 'joe-sugarman.png',
  'john-carlton': 'john-carlton.png',
  'johncarlton': 'john-carlton.png',
  'john-caples': 'john-caples.png',
  'johncaples': 'john-caples.png',
  'victor-schwab': 'victor-schwab.png',
  'victorschwab': 'victor-schwab.png',
  'jason-fladlien': 'jason-fladlien.png',
  'jasonfladlien': 'jason-fladlien.png',
  'jon-benson': 'jon-benson.png',
  'jonbenson': 'jon-benson.png',
  'robert-bly': 'robert-bly.png',
  'robertbly': 'robert-bly.png',
  'stefan-georgi': 'stefan-georgi.png',
  'stefangeorgi': 'stefan-georgi.png',
  'todd-brown': 'todd-brown.png',
  'toddbrown': 'todd-brown.png',
  'copywriter': 'copywriter.png',
  'copywriting-chief': 'copywriting-chief.png',
};

const AVATAR_BASE_PATH = '/avatars';
const SQUAD_IMAGE_BASE_PATH = '/avatars/squads';

// Known squad image mappings (squad-id → filename)
const SQUAD_IMAGE_MAP: Record<string, string> = {
  'aios-core': 'aios-core.png',
  'clone': 'clone.png',
  'copywriting': 'copywriting.png',
  'design': 'design.png',
  'squad-creator-pro': 'squad-creator-pro.png',
  'aios-development': 'aios-development.png',
  'academic-research': 'academic-research.png',
  'agora-direct-response': 'agora-direct-response.png',
  'aios-core-dev': 'aios-core-dev.png',
  'asmr-shorts': 'asmr-shorts.png',
};

/**
 * Get the avatar URL for a given agent name.
 * Tries exact match, then normalized (lowercase, trimmed).
 * Returns undefined if no avatar is found.
 */
export function getAgentAvatarUrl(agentName: string): string | undefined {
  const normalized = agentName.toLowerCase().trim();

  // Exact match
  if (AVATAR_MAP[normalized]) {
    return `${AVATAR_BASE_PATH}/${AVATAR_MAP[normalized]}`;
  }

  // Try with spaces replaced by hyphens (e.g. "Alan Nicolas" → "alan-nicolas")
  const hyphenated = normalized.replace(/\s+/g, '-');
  if (AVATAR_MAP[hyphenated]) {
    return `${AVATAR_BASE_PATH}/${AVATAR_MAP[hyphenated]}`;
  }

  // Try without common prefixes/suffixes
  const stripped = normalized
    .replace(/^@/, '')
    .replace(/-agent$/, '')
    .replace(/-expert$/, '');

  if (AVATAR_MAP[stripped]) {
    return `${AVATAR_BASE_PATH}/${AVATAR_MAP[stripped]}`;
  }

  // Strip parenthetical role suffix: "Dex (Dev)" → "dex", "Brad Frost (DS)" → "brad-frost"
  const withoutParens = normalized.replace(/\s*\(.*?\)\s*$/, '').trim();
  if (withoutParens !== normalized) {
    const parenHyphenated = withoutParens.replace(/\s+/g, '-');
    if (AVATAR_MAP[withoutParens]) {
      return `${AVATAR_BASE_PATH}/${AVATAR_MAP[withoutParens]}`;
    }
    if (AVATAR_MAP[parenHyphenated]) {
      return `${AVATAR_BASE_PATH}/${AVATAR_MAP[parenHyphenated]}`;
    }
  }

  // Strip common role suffixes from IDs: "dex-dev" → "dex", "aria-architect" → "aria"
  const roleSuffixes = ['-dev', '-qa', '-po', '-pm', '-sm', '-devops', '-architect', '-analyst', '-ds'];
  for (const suffix of roleSuffixes) {
    if (normalized.endsWith(suffix)) {
      const base = normalized.slice(0, -suffix.length);
      if (AVATAR_MAP[base]) {
        return `${AVATAR_BASE_PATH}/${AVATAR_MAP[base]}`;
      }
    }
  }

  return undefined;
}

/**
 * Check if an agent has a generated avatar.
 */
export function hasAgentAvatar(agentName: string): boolean {
  return getAgentAvatarUrl(agentName) !== undefined;
}

/**
 * Get the brandbook codename for an agent.
 */
const CODENAME_MAP: Record<string, string> = {
  'architect': 'ARIA',
  'analyst': 'ATLAS',
  'squad-creator': 'CRAFT',
  'data-engineer': 'DARA',
  'dev': 'DEX',
  'devops': 'GAGE',
  'pm': 'MORGAN',
  'aios-master': 'ORION',
  'po': 'PAX',
  'qa': 'QUINN',
  'sm': 'RIVER',
  'ux-design-expert': 'UMA',
};

/**
 * Get the image URL for a given squad ID.
 * Returns undefined if no image is found.
 */
export function getSquadImageUrl(squadId: string): string | undefined {
  const normalized = squadId.toLowerCase().trim();
  if (SQUAD_IMAGE_MAP[normalized]) {
    return `${SQUAD_IMAGE_BASE_PATH}/${SQUAD_IMAGE_MAP[normalized]}`;
  }
  return undefined;
}

/**
 * Check if a squad has a generated image.
 */
export function hasSquadImage(squadId: string): boolean {
  return getSquadImageUrl(squadId) !== undefined;
}

export function getAgentCodename(agentName: string): string | undefined {
  const normalized = agentName.toLowerCase().trim().replace(/^@/, '');
  return CODENAME_MAP[normalized];
}
