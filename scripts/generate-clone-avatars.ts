/**
 * Clone Avatar Generation Pipeline
 *
 * Generates AIOX-branded cyberpunk avatars for clone agents using real photos
 * as reference, preserving facial fidelity while applying the AIOX Brandbook style.
 *
 * Model: GPT-Image 1.5 Edit (fal-ai/gpt-image-1.5/edit)
 *   - Best for facial fidelity preservation
 *   - Supports multiple reference images (photo + style reference)
 *   - input_fidelity: "high" for max identity preservation
 *
 * Usage:
 *   npx tsx scripts/generate-clone-avatars.ts --clone pedro-valerio --photo ./photos/pedro.jpg
 *   npx tsx scripts/generate-clone-avatars.ts --all
 *   npx tsx scripts/generate-clone-avatars.ts --dry-run
 */

import * as fal from '@fal-ai/serverless-client';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const AVATARS_DIR = path.resolve(__dirname, '../public/avatars');
const CLONE_PHOTOS_DIR = path.resolve(__dirname, '../data/clone-photos');
const MANIFEST_PATH = path.join(AVATARS_DIR, 'clone-manifest.json');

// AIOX Brandbook Style Reference — the "golden" avatar that defines the look
const STYLE_REFERENCE_PATH = path.join(AVATARS_DIR, 'alan-nicolas.png');

const MODEL_ID = 'fal-ai/gpt-image-1.5/edit';

// ============================================================================
// CLONE REGISTRY
// Each clone needs: id, displayName, photoFile, and physical descriptors
// for prompt accuracy
// ============================================================================

interface CloneDefinition {
  id: string;
  displayName: string;
  photoFile: string; // filename in CLONE_PHOTOS_DIR
  descriptors: {
    gender: 'male' | 'female';
    hairStyle: string;
    hairColor: string;
    facialHair: string;
    skinTone: string;
    distinguishingFeatures: string;
    accessories?: string;
  };
  /** Optional pose/expression override */
  expression?: string;
}

const CLONE_REGISTRY: CloneDefinition[] = [
  {
    id: 'alan-nicolas',
    displayName: 'Alan Nicolas',
    photoFile: 'alan-nicolas.jpg',
    descriptors: {
      gender: 'male',
      hairStyle: 'short black hair styled up',
      hairColor: 'black',
      facialHair: 'full thick black beard',
      skinTone: 'medium tan',
      distinguishingFeatures: 'strong jawline, intense gaze',
      accessories: 'amber/orange tinted tactical glasses',
    },
    expression: 'serious and commanding',
  },
  {
    id: 'pedro-valerio',
    displayName: 'Pedro Valerio',
    photoFile: 'pedro-valerio.jpg',
    descriptors: {
      gender: 'male',
      hairStyle: 'medium brown hair swept to the side',
      hairColor: 'dark brown',
      facialHair: 'well-trimmed beard and stubble',
      skinTone: 'light',
      distinguishingFeatures: 'bright blue-green eyes, strong cheekbones, warm smile',
    },
    expression: 'confident and approachable',
  },
  {
    id: 'thiago-finch',
    displayName: 'Thiago Finch',
    photoFile: 'thiago-finch.jpg',
    descriptors: {
      gender: 'male',
      hairStyle: 'medium-length wavy hair past ears',
      hairColor: 'dark brown with subtle highlights',
      facialHair: 'clean-shaven with light stubble',
      skinTone: 'light-medium olive',
      distinguishingFeatures: 'athletic build, sharp jawline, piercing eyes',
    },
    expression: 'serious and determined',
  },
];

// ============================================================================
// PROMPT BUILDER
// ============================================================================

/**
 * Builds a style-transfer prompt that preserves facial identity while
 * applying the AIOX Brandbook cyberpunk aesthetic.
 *
 * The prompt explicitly tells the model:
 * 1. PRESERVE exact facial features from the first reference image
 * 2. MATCH the style of the second reference image (AIOX avatar)
 * 3. Apply specific brandbook visual elements
 */
function buildClonePrompt(clone: CloneDefinition): string {
  const d = clone.descriptors;

  const identityBlock = [
    `CRITICAL: Preserve the EXACT facial features, face shape, ${d.hairStyle}, ${d.hairColor} hair color,`,
    d.facialHair !== 'none' ? `${d.facialHair},` : '',
    `${d.skinTone} skin tone, and ${d.distinguishingFeatures} from the FIRST reference image.`,
    d.accessories ? `Include their ${d.accessories}.` : '',
    `The person should look ${clone.expression || 'serious and confident'}.`,
  ]
    .filter(Boolean)
    .join(' ');

  const styleBlock = [
    'Transform this person into a cyberpunk tech commander portrait',
    'in the EXACT same visual style as the SECOND reference image.',
    'Apply:',
    '- Dark near-black background (#0A0A0A)',
    '- Black matte tactical armor/tech jacket with "AIOX" branding on the chest',
    '- Neon lime green (#D1FF00) glowing accent lines on armor edges, seams, and collar',
    '- Cyberpunk aesthetic with subtle tech HUD elements',
    '- Half-body shot from chest up, slight 3/4 angle',
    '- Dramatic cinematic side lighting with neon lime rim light on one side',
    '- High-detail photorealistic 8K rendering',
    '- Black gloves with neon lime knuckle accents',
  ].join('\n');

  return `${identityBlock}\n\n${styleBlock}`;
}

// ============================================================================
// GENERATION
// ============================================================================

interface GenerationResult {
  cloneId: string;
  success: boolean;
  outputPath?: string;
  imageUrl?: string;
  prompt: string;
  error?: string;
}

async function uploadFile(filePath: string): Promise<string> {
  const file = new File(
    [readFileSync(filePath)],
    path.basename(filePath),
    { type: filePath.endsWith('.png') ? 'image/png' : 'image/jpeg' }
  );
  const url = await fal.storage.upload(file);
  return url;
}

async function generateCloneAvatar(
  clone: CloneDefinition,
  styleReferenceUrl: string,
  dryRun = false
): Promise<GenerationResult> {
  const prompt = buildClonePrompt(clone);
  const photoPath = path.join(CLONE_PHOTOS_DIR, clone.photoFile);

  if (!existsSync(photoPath)) {
    return {
      cloneId: clone.id,
      success: false,
      prompt,
      error: `Photo not found: ${photoPath}`,
    };
  }

  console.log(`\n--- Generating avatar for: ${clone.displayName} ---`);
  console.log(`Photo: ${photoPath}`);
  console.log(`Prompt:\n${prompt}\n`);

  if (dryRun) {
    return { cloneId: clone.id, success: true, prompt };
  }

  try {
    // Upload clone's photo
    const photoUrl = await uploadFile(photoPath);
    console.log(`Uploaded photo: ${photoUrl}`);

    // Generate with GPT-Image 1.5 Edit
    // image_urls[0] = clone's real photo (for facial identity)
    // image_urls[1] = AIOX style reference (for visual style)
    const result = await fal.subscribe(MODEL_ID, {
      input: {
        prompt,
        image_urls: [photoUrl, styleReferenceUrl],
        input_fidelity: 'high',
        image_size: '1024x1024',
        quality: 'high',
        num_images: 1,
        output_format: 'png',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log(`  [${clone.id}] Generating...`);
        }
      },
    });

    const imageUrl = (result as { images?: Array<{ url: string }> }).images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Download to avatars directory
    const outputPath = path.join(AVATARS_DIR, `${clone.id}.png`);
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buffer);

    console.log(`  Saved: ${outputPath} (${(buffer.length / 1024).toFixed(0)}KB)`);

    return {
      cloneId: clone.id,
      success: true,
      outputPath,
      imageUrl,
      prompt,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ERROR for ${clone.id}:`, errorMessage);
    return {
      cloneId: clone.id,
      success: false,
      prompt,
      error: errorMessage,
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const cloneFilter = args.find((a) => a.startsWith('--clone='))?.split('=')[1]
    || (args.includes('--clone') ? args[args.indexOf('--clone') + 1] : null);

  // Ensure directories exist
  mkdirSync(AVATARS_DIR, { recursive: true });
  mkdirSync(CLONE_PHOTOS_DIR, { recursive: true });

  // Filter clones
  const clones = cloneFilter
    ? CLONE_REGISTRY.filter((c) => c.id === cloneFilter)
    : CLONE_REGISTRY;

  if (clones.length === 0) {
    console.error(`Clone not found: ${cloneFilter}`);
    console.log('Available clones:', CLONE_REGISTRY.map((c) => c.id).join(', '));
    process.exit(1);
  }

  console.log(`=== Clone Avatar Generation ===`);
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Clones: ${clones.map((c) => c.displayName).join(', ')}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Output: ${AVATARS_DIR}`);

  // Upload style reference once (reused for all clones)
  let styleReferenceUrl = '';
  if (!dryRun) {
    if (!existsSync(STYLE_REFERENCE_PATH)) {
      console.error(`Style reference not found: ${STYLE_REFERENCE_PATH}`);
      console.log('Place the AIOX-style reference avatar at this path.');
      process.exit(1);
    }
    console.log('\nUploading style reference...');
    styleReferenceUrl = await uploadFile(STYLE_REFERENCE_PATH);
    console.log(`Style reference URL: ${styleReferenceUrl}`);
  }

  // Generate sequentially (to respect rate limits)
  const results: GenerationResult[] = [];
  for (const clone of clones) {
    const result = await generateCloneAvatar(clone, styleReferenceUrl, dryRun);
    results.push(result);
  }

  // Update manifest
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    : { generated: [], pipeline: {} };

  manifest.pipeline = {
    model: MODEL_ID,
    settings: {
      input_fidelity: 'high',
      image_size: '1024x1024',
      quality: 'high',
      output_format: 'png',
    },
    styleReference: 'alan-nicolas.png',
    lastRun: new Date().toISOString(),
  };

  for (const result of results) {
    if (result.success && result.outputPath) {
      const existing = manifest.generated.findIndex(
        (g: Record<string, unknown>) => g.cloneId === result.cloneId
      );
      const entry = {
        cloneId: result.cloneId,
        file: `${result.cloneId}.png`,
        generatedAt: new Date().toISOString(),
        prompt: result.prompt,
        sourceUrl: result.imageUrl,
      };
      if (existing >= 0) {
        manifest.generated[existing] = entry;
      } else {
        manifest.generated.push(entry);
      }
    }
  }

  if (!dryRun) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest updated: ${MANIFEST_PATH}`);
  }

  // Summary
  console.log('\n=== Results ===');
  for (const r of results) {
    const status = r.success ? 'OK' : `FAIL: ${r.error}`;
    console.log(`  ${r.cloneId}: ${status}`);
  }
}

main().catch(console.error);
