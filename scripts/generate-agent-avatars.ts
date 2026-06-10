/**
 * Avatar Generation Script for AIOS Platform
 *
 * Generates unique cyberpunk-style agent avatars using fal.ai Flux 2.
 * Each avatar follows the AIOX brandbook (dark bg, lime #D1FF00 accents,
 * sci-fi armor) while being unique to the agent's personality and function.
 *
 * Usage:
 *   npx tsx scripts/generate-agent-avatars.ts [--squad <name>] [--agent <name>] [--dry-run]
 */

import { fal } from '@fal-ai/client';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';

// ─── Brandbook Constants ─────────────────────────────────────────────────────
const _BRAND = {
  primaryColor: '#D1FF00',     // Lime neon
  bgColor: '#0A0A0A',         // Near-black
  accentDark: '#1A1A1A',
  secondaryGlow: '#00FFD1',   // Teal glow variant
};

// ─── Agent Metadata Types ────────────────────────────────────────────────────
interface AgentMeta {
  squad: string;
  agentName: string;
  displayName: string;
  title: string;
  role: string;
  tier: string;
  style: string;
  identity: string;
}

// ─── Visual Trait Mapping ────────────────────────────────────────────────────
// Maps agent functions/roles to unique visual armor descriptors

const ROLE_ARMOR_MAP: Record<string, string> = {
  // Development / Engineering
  dev: 'sleek tactical visor with holographic code streams, circuit-trace patterns on shoulder plates, LED-lit keyboard gauntlet on forearm',
  developer: 'sleek tactical visor with holographic code streams, circuit-trace patterns on shoulder plates, LED-lit keyboard gauntlet on forearm',
  engineer: 'heavy-duty industrial exosuit with hydraulic joints, welding torch attachment, reinforced titanium plating',
  architect: 'elegant flowing cape with blueprint-pattern lining, crystalline visor showing wireframe structures, slim noble armor with geometric engravings',

  // Operations / DevOps
  devops: 'military tactical vest with ammo-belt of USB drives, combat helmet with antenna array, rugged field-ready armor',
  ops: 'military tactical vest with ammo-belt of USB drives, combat helmet with antenna array, rugged field-ready armor',
  infrastructure: 'heavy power armor with server rack backpack, cable-conduit limbs, cooling vent exhaust ports',

  // Quality / Testing
  qa: 'precision sniper-style visor with crosshair HUD, scanner array on chest, white-striped inspection armor',
  quality: 'precision sniper-style visor with crosshair HUD, scanner array on chest, white-striped inspection armor',
  tester: 'precision sniper-style visor with crosshair HUD, scanner array on chest, white-striped inspection armor',

  // Management / Leadership
  chief: 'commanding officer power armor with rank insignia, holographic command display on gauntlet, cape with data-stream lining',
  manager: 'officer-grade armor with tactical display on forearm, communication relay on shoulder, authority markings',
  lead: 'officer-grade armor with tactical display on forearm, communication relay on shoulder, authority markings',
  master: 'ornate ceremonial armor with gold-traced circuit patterns, wisdom runes etched into visor, elder warrior presence',
  orchestrator: 'conductor-style armor with multi-arm mechanical attachments, holographic baton, symphony of floating displays',

  // Data / Analytics
  data: 'sleek data-analyst armor with floating holographic charts, visor showing real-time dashboards, crystalline data-core chest piece',
  analyst: 'sleek data-analyst armor with floating holographic charts, visor showing real-time dashboards, crystalline data-core chest piece',
  analytics: 'sleek data-analyst armor with floating holographic charts, visor showing real-time dashboards, crystalline data-core chest piece',
  researcher: 'academic-style lab coat over light armor, magnifying lens visor, specimen containers on belt',

  // Design / Creative
  designer: 'artistic armor with paint-splatter patterns, color palette projected from gauntlet, creative flowing silhouette',
  creative: 'artistic armor with paint-splatter patterns, color palette projected from gauntlet, creative flowing silhouette',
  ux: 'minimalist clean-line armor with touch-screen forearm panels, user-flow hologram projector, ergonomic curves',
  writer: 'scribe-class armor with quill-shaped antenna, scrolling text on visor display, ink-cartridge belt pouches',
  copywriter: 'scribe-class armor with quill-shaped antenna, scrolling text on visor display, ink-cartridge belt pouches',

  // Strategy / Product
  strategist: 'chess-piece inspired armor with crown motif, tactical map hologram, authority-grade plating',
  product: 'product-manager armor with roadmap display on chest, stakeholder comm array, balanced practical design',
  pm: 'product-manager armor with roadmap display on chest, stakeholder comm array, balanced practical design',
  po: 'shield-bearing guardian armor with acceptance criteria glowing on shield face, validation scanner visor',
  scrum: 'agile sprint armor with kanban board projected from arm, velocity tracker on visor, lightweight mobile suit',

  // Security
  security: 'dark stealth armor with encryption patterns, firewall shield generator, lock-pick toolkit on belt',
  guard: 'heavy sentinel armor with shield generator, surveillance drone on shoulder, fortress-grade plating',

  // Communication / Community
  community: 'ambassador-class armor with broadcast antenna array, welcome beacon on chest, warm glow accents',
  support: 'medic-style armor with diagnostic scanner, repair tools, first-responder markings',

  // Finance / Business
  finance: 'banker-class armor with stock ticker visor, gold-accented plating, currency hologram projector',
  business: 'executive power suit with holographic briefcase, corporate insignia, sleek professional finish',
  sales: 'negotiator armor with persuasion amplifier visor, deal-closer gauntlet, charismatic energy field',

  // AI / ML
  ai: 'neural-network patterned armor with glowing synaptic connections, brain-shaped visor, quantum processor chest core',
  ml: 'neural-network patterned armor with glowing synaptic connections, brain-shaped visor, quantum processor chest core',

  // Default
  default: 'standard-issue cyberpunk armor with modular attachments, functional visor, balanced military-civilian design',
};

const STYLE_PERSONALITY_MAP: Record<string, string> = {
  // Personality → Pose/Expression/Aura
  strategic: 'confident commanding pose, arms crossed, aura of authority',
  creative: 'dynamic artistic pose, one hand raised with energy, creative spark aura',
  analytical: 'focused contemplative pose, chin slightly down, data streams around head',
  aggressive: 'forward-leaning battle stance, intense gaze, power aura',
  calm: 'relaxed standing pose, serene presence, gentle ambient glow',
  technical: 'hands near holographic controls, focused technical gaze, precision energy',
  charismatic: 'open welcoming pose, warm smile behind visor, magnetic presence',
  methodical: 'precise measured stance, organized tools displayed, orderly energy',
  direct: 'facing camera head-on, no-nonsense stance, sharp edges',
  pragmatic: 'practical ready stance, tools at hand, efficient energy',
  visionary: 'looking upward into the distance, expansive gesture, cosmic energy',
  rigorous: 'strict upright posture, clipboard or checklist hologram, exacting presence',
  default: 'neutral confident stance, balanced pose, professional presence',
};

const TIER_ACCENTS: Record<string, string> = {
  '0': 'gold-trimmed elite commander markings, crown-like helmet crest, maximum glow intensity',
  '1': 'silver-accented master-class insignia, distinguished veteran markings, strong glow',
  '2': 'standard specialist markings, professional clean lines, moderate glow',
  '3': 'trainee-grade lighter armor, learning badges, subtle glow',
  default: 'standard cyberpunk markings, balanced glow intensity',
};

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildPrompt(agent: AgentMeta): string {
  // Determine armor style from role keywords
  const roleLower = (agent.role + ' ' + agent.title).toLowerCase();
  let armorDesc = ROLE_ARMOR_MAP.default;
  for (const [key, desc] of Object.entries(ROLE_ARMOR_MAP)) {
    if (key !== 'default' && roleLower.includes(key)) {
      armorDesc = desc;
      break;
    }
  }

  // Determine personality/pose from style keywords
  const styleLower = (agent.style || '').toLowerCase();
  let personalityDesc = STYLE_PERSONALITY_MAP.default;
  for (const [key, desc] of Object.entries(STYLE_PERSONALITY_MAP)) {
    if (key !== 'default' && styleLower.includes(key)) {
      personalityDesc = desc;
      break;
    }
  }

  // Tier-based accents
  const tierAccent = TIER_ACCENTS[agent.tier] || TIER_ACCENTS.default;

  // Unique seed from agent name (for deterministic visual variation)
  const nameHash = agent.agentName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const genderHint = nameHash % 3 === 0 ? 'female warrior' : nameHash % 3 === 1 ? 'male warrior' : 'androgynous warrior';
  const helmetVariant = nameHash % 4 === 0 ? 'open-face helmet showing jaw' : nameHash % 4 === 1 ? 'full enclosed visor' : nameHash % 4 === 2 ? 'half-face tactical mask' : 'sleek minimal headpiece';

  const prompt = [
    `Cyberpunk ${genderHint} portrait, cinematic half-body shot, slightly angled pose.`,
    `Black matte futuristic armor with neon lime (#D1FF00) glowing accents on visor, circuits, and joints.`,
    `${armorDesc}.`,
    `${helmetVariant}.`,
    `${tierAccent}.`,
    `${personalityDesc}.`,
    `Dark background (#0A0A0A), volumetric fog, cinematic rim lighting with lime green edge glow.`,
    `Hyper-detailed sci-fi illustration, digital art, 4K quality, sharp focus.`,
    `No text, no watermark, no signature.`,
  ].join(' ');

  return prompt;
}

// ─── Agent Data Parser ───────────────────────────────────────────────────────

function parseAgentLine(line: string): AgentMeta | null {
  if (!line.startsWith('AGENT|')) return null;
  const parts = line.split('|');
  if (parts.length < 9) return null;
  return {
    squad: parts[1],
    agentName: parts[2],
    displayName: parts[3] || parts[2],
    title: parts[4] || '',
    role: parts[5] || '',
    tier: parts[6] || '2',
    style: parts[7] || '',
    identity: parts[8] || '',
  };
}

// ─── Main Generation Pipeline ────────────────────────────────────────────────

interface GenerationResult {
  agent: AgentMeta;
  prompt: string;
  imageUrl?: string;
  localPath?: string;
  error?: string;
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function generateAvatar(agent: AgentMeta, outputDir: string, dryRun = false): Promise<GenerationResult> {
  const prompt = buildPrompt(agent);
  const result: GenerationResult = { agent, prompt };

  if (dryRun) {
    console.log(`[DRY-RUN] ${agent.squad}/${agent.agentName}`);
    console.log(`  Prompt: ${prompt.slice(0, 120)}...`);
    return result;
  }

  try {
    console.log(`[GENERATING] ${agent.squad}/${agent.agentName}...`);

    const response = await fal.subscribe('fal-ai/flux-2/flash', {
      input: {
        prompt,
        image_size: 'square_hd',
        num_images: 1,
        output_format: 'png',
        guidance_scale: 3.5,
        enable_safety_checker: true,
      },
      logs: false,
    });

    const data = response.data as { images?: Array<{ url: string }> };
    if (data?.images?.[0]?.url) {
      result.imageUrl = data.images[0].url;

      // Download to local
      const filename = `${agent.agentName}.png`;
      const destPath = path.join(outputDir, filename);
      await downloadImage(result.imageUrl, destPath);
      result.localPath = destPath;
      console.log(`  [OK] Saved to ${filename}`);
    }
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] ${result.error}`);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const squadFilter = args.includes('--squad') ? args[args.indexOf('--squad') + 1] : null;
  const agentFilter = args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null;

  // Read agent data
  const dataFile = path.resolve(__dirname, '../data/agents-metadata.txt');
  if (!fs.existsSync(dataFile)) {
    console.error(`Agent metadata file not found: ${dataFile}`);
    console.error('Run the extraction script first to generate agents-metadata.txt');
    process.exit(1);
  }

  const lines = fs.readFileSync(dataFile, 'utf-8').split('\n');
  let agents = lines.map(parseAgentLine).filter((a): a is AgentMeta => a !== null);

  // Apply filters
  if (squadFilter) agents = agents.filter(a => a.squad.includes(squadFilter));
  if (agentFilter) agents = agents.filter(a => a.agentName.includes(agentFilter));

  // Skip agents that already have avatars
  const outputDir = path.resolve(__dirname, '../public/avatars');
  fs.mkdirSync(outputDir, { recursive: true });

  const existing = new Set(
    fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
      .map(f => f.replace(/\.(png|jpg)$/, ''))
  );

  const toGenerate = agents.filter(a => !existing.has(a.agentName));

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   AIOX Agent Avatar Generator                ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`  Total agents: ${agents.length}`);
  console.log(`  Already generated: ${existing.size}`);
  console.log(`  To generate: ${toGenerate.length}`);
  console.log(`  Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`  Model: fal-ai/flux-2/flash`);
  console.log(`  Output: ${outputDir}\n`);

  if (toGenerate.length === 0) {
    console.log('All avatars already generated!');
    return;
  }

  const results: GenerationResult[] = [];

  // Generate in batches of 5 for rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toGenerate.length / BATCH_SIZE)} ---`);

    const batchResults = await Promise.all(
      batch.map(agent => generateAvatar(agent, outputDir, dryRun))
    );
    results.push(...batchResults);

    // Small delay between batches
    if (i + BATCH_SIZE < toGenerate.length && !dryRun) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Write manifest
  const manifest: Record<string, { squad: string; imageUrl?: string; prompt: string }> = {};
  for (const r of results) {
    manifest[r.agent.agentName] = {
      squad: r.agent.squad,
      imageUrl: r.imageUrl,
      prompt: r.prompt,
    };
  }

  const manifestPath = path.join(outputDir, 'manifest.json');

  // Merge with existing manifest
  let existingManifest: Record<string, unknown> = {};
  if (fs.existsSync(manifestPath)) {
    existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ ...existingManifest, ...manifest }, null, 2)
  );

  // Summary
  const ok = results.filter(r => r.localPath);
  const errors = results.filter(r => r.error);
  console.log(`\n═══ Summary ═══`);
  console.log(`  Generated: ${ok.length}`);
  console.log(`  Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.log(`    - ${e.agent.agentName}: ${e.error}`));
  }
}

main().catch(console.error);
