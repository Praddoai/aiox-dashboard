// Pixel art SVG sprite data for agents and furniture
// Each agent gets a UNIQUE look derived from their name hash

import type { DomainId } from './world-layout';
import type { AgentTier } from '../../types';

// ── Hash function to derive deterministic visual traits from agent name ──

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickFrom<T>(arr: readonly T[], hash: number, offset = 0): T {
  return arr[((hash >> offset) & 0xffff) % arr.length];
}

// ── Color palette for unique agent tinting ──

const skinTones = ['#FFDAB9', '#F5CBA7', '#E8B896', '#D4A574', '#C68B59', '#A0785A'] as const;
const hairColors = ['#2D3436', '#634832', '#B97A57', '#E8D5B7', '#FF6B6B', '#74B9FF', '#A29BFE', '#DFE6E9', '#FFEAA7', '#55E6A5'] as const;

// Accessory types — drawn as pixel rects on top of the base sprite
export type AccessoryType = 'none' | 'glasses' | 'headphones' | 'hat' | 'scarf' | 'bowtie' | 'earring' | 'bandana';
const accessories: readonly AccessoryType[] = ['none', 'glasses', 'headphones', 'hat', 'scarf', 'bowtie', 'earring', 'bandana'];

// Hair style shapes
export type HairStyle = 'short' | 'spiky' | 'long' | 'mohawk' | 'bun' | 'buzz' | 'wavy' | 'afro';
const hairStyles: readonly HairStyle[] = ['short', 'spiky', 'long', 'mohawk', 'bun', 'buzz', 'wavy', 'afro'];

// Body pattern
export type BodyPattern = 'solid' | 'striped' | 'vest' | 'tshirt' | 'hoodie' | 'lab';
const bodyPatterns: readonly BodyPattern[] = ['solid', 'striped', 'vest', 'tshirt', 'hoodie', 'lab'];

export interface SpriteColors {
  head: string;
  body: string;
  legs: string;
  accent: string;
}

// Domain base colors for the body
export const domainSpriteColors: Record<DomainId, SpriteColors> = {
  content: { head: '#FFD93D', body: '#FF6B6B', legs: '#CC5555', accent: '#FFE66D' },
  sales:   { head: '#FECA57', body: '#FF9F43', legs: '#CC7F36', accent: '#FFDD59' },
  dev:     { head: '#48DBFB', body: '#54A0FF', legs: '#3D7ACC', accent: '#74E4FC' },
  design:  { head: '#FF9FF3', body: '#FF6B81', legs: '#CC5567', accent: '#FFB8F8' },
  data:    { head: '#DDA0DD', body: '#A29BFE', legs: '#827CCB', accent: '#E8C3E8' },
  ops:     { head: '#7BED9F', body: '#2ED573', legs: '#25AA5C', accent: '#A3F5BD' },
};

// Status colors
export const statusColors = {
  online: '#2ED573',
  busy: '#FECA57',
  offline: '#636E72',
} as const;

// Tier badge shapes
export const tierBadge: Record<AgentTier, { symbol: string; color: string }> = {
  0: { symbol: '\u2605', color: '#FFD700' },
  1: { symbol: '◆', color: '#C0C0C0' },
  2: { symbol: '●', color: '#CD7F32' },
};

// ── Unique Agent Identity ──

export interface AgentIdentity {
  skinTone: string;
  hairColor: string;
  hairStyle: HairStyle;
  accessory: AccessoryType;
  bodyPattern: BodyPattern;
  bodyHue: number; // 0-360 hue rotation applied to domain body color
}

/** Deterministically generate a unique visual identity from an agent name */
export function getAgentIdentity(agentName: string): AgentIdentity {
  const h = hashStr(agentName);
  return {
    skinTone: pickFrom(skinTones, h, 0),
    hairColor: pickFrom(hairColors, h, 4),
    hairStyle: pickFrom(hairStyles, h, 8),
    accessory: pickFrom(accessories, h, 12),
    bodyPattern: pickFrom(bodyPatterns, h, 16),
    bodyHue: (h >> 20) % 40 - 20, // -20 to +20 degrees hue shift
  };
}

/** Shift a hex color's hue by N degrees */
function shiftHue(hex: string, degrees: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return hex; // achromatic
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  h = ((h * 360 + degrees) % 360) / 360;
  if (h < 0) h += 1;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rr = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const gg = Math.round(hue2rgb(p, q, h) * 255);
  const bb = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return `#${rr.toString(16).padStart(2,'0')}${gg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`;
}

// ── Rect types for building sprites ──

export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity?: number;
  rx?: number;
}

// ── Build unique agent sprite rects (16x16 viewBox) ──

export function agentSpriteRects(domainColors: SpriteColors, identity?: AgentIdentity): SpriteRect[] {
  const id = identity || {
    skinTone: '#FFDAB9', hairColor: '#2D3436', hairStyle: 'short' as HairStyle,
    accessory: 'none' as AccessoryType, bodyPattern: 'solid' as BodyPattern, bodyHue: 0,
  };

  const skin = id.skinTone;
  const hair = id.hairColor;
  const bodyBase = shiftHue(domainColors.body, id.bodyHue);
  const bodyDark = shiftHue(domainColors.legs, id.bodyHue);
  const accent = domainColors.accent;

  const rects: SpriteRect[] = [];

  // ─ Hair (varies by style) ─
  switch (id.hairStyle) {
    case 'short':
      rects.push({ x: 5, y: 0, w: 6, h: 2, fill: hair });
      rects.push({ x: 5, y: 0, w: 1, h: 3, fill: hair });
      rects.push({ x: 10, y: 0, w: 1, h: 3, fill: hair });
      break;
    case 'spiky':
      rects.push({ x: 5, y: 0, w: 6, h: 1, fill: hair });
      rects.push({ x: 6, y: -1, w: 1, h: 1, fill: hair });
      rects.push({ x: 8, y: -1, w: 1, h: 1, fill: hair });
      rects.push({ x: 10, y: -1, w: 1, h: 1, fill: hair });
      break;
    case 'long':
      rects.push({ x: 5, y: 0, w: 6, h: 2, fill: hair });
      rects.push({ x: 4, y: 1, w: 1, h: 5, fill: hair });
      rects.push({ x: 11, y: 1, w: 1, h: 5, fill: hair });
      break;
    case 'mohawk':
      rects.push({ x: 7, y: -1, w: 2, h: 2, fill: hair });
      rects.push({ x: 7, y: 0, w: 2, h: 1, fill: hair });
      break;
    case 'bun':
      rects.push({ x: 5, y: 0, w: 6, h: 2, fill: hair });
      rects.push({ x: 7, y: -2, w: 3, h: 2, fill: hair, rx: 1 });
      break;
    case 'buzz':
      rects.push({ x: 5, y: 0, w: 6, h: 1, fill: hair, opacity: 0.6 });
      break;
    case 'wavy':
      rects.push({ x: 5, y: 0, w: 6, h: 2, fill: hair });
      rects.push({ x: 4, y: 1, w: 1, h: 4, fill: hair });
      rects.push({ x: 11, y: 1, w: 1, h: 3, fill: hair });
      break;
    case 'afro':
      rects.push({ x: 4, y: -1, w: 8, h: 4, fill: hair, rx: 2 });
      break;
  }

  // ─ Head / skin ─
  rects.push({ x: 5, y: 1, w: 6, h: 4, fill: skin });
  // Neck
  rects.push({ x: 7, y: 5, w: 2, h: 1, fill: skin });

  // ─ Eyes ─
  rects.push({ x: 6, y: 3, w: 1, h: 1, fill: '#2D3436' });
  rects.push({ x: 9, y: 3, w: 1, h: 1, fill: '#2D3436' });
  // Mouth
  rects.push({ x: 7, y: 4, w: 2, h: 0.5, fill: '#E17055', opacity: 0.6 });

  // ─ Body (varies by pattern) ─
  switch (id.bodyPattern) {
    case 'solid':
      rects.push({ x: 4, y: 6, w: 8, h: 5, fill: bodyBase });
      break;
    case 'striped':
      rects.push({ x: 4, y: 6, w: 8, h: 5, fill: bodyBase });
      rects.push({ x: 4, y: 7, w: 8, h: 1, fill: accent, opacity: 0.5 });
      rects.push({ x: 4, y: 9, w: 8, h: 1, fill: accent, opacity: 0.5 });
      break;
    case 'vest':
      rects.push({ x: 4, y: 6, w: 8, h: 5, fill: bodyBase });
      rects.push({ x: 6, y: 6, w: 4, h: 5, fill: bodyDark });
      break;
    case 'tshirt':
      rects.push({ x: 4, y: 6, w: 8, h: 5, fill: bodyBase });
      rects.push({ x: 6, y: 6, w: 4, h: 2, fill: accent, opacity: 0.4 }); // collar
      break;
    case 'hoodie':
      rects.push({ x: 4, y: 6, w: 8, h: 5, fill: bodyBase });
      rects.push({ x: 6, y: 5, w: 4, h: 2, fill: bodyBase }); // hood behind head
      rects.push({ x: 6, y: 8, w: 4, h: 2, fill: bodyDark }); // front pocket
      break;
    case 'lab':
      rects.push({ x: 4, y: 6, w: 8, h: 5, fill: '#F5F6FA' }); // white coat
      rects.push({ x: 6, y: 6, w: 4, h: 5, fill: bodyBase }); // shirt underneath
      rects.push({ x: 4, y: 6, w: 2, h: 5, fill: '#F5F6FA' }); // left lapel
      rects.push({ x: 10, y: 6, w: 2, h: 5, fill: '#F5F6FA' }); // right lapel
      break;
  }

  // ─ Arms ─
  rects.push({ x: 2, y: 7, w: 2, h: 3, fill: bodyBase });
  rects.push({ x: 12, y: 7, w: 2, h: 3, fill: bodyBase });
  // Hands
  rects.push({ x: 2, y: 10, w: 2, h: 1, fill: skin });
  rects.push({ x: 12, y: 10, w: 2, h: 1, fill: skin });

  // ─ Belt ─
  rects.push({ x: 4, y: 11, w: 8, h: 1, fill: bodyDark });

  // ─ Legs ─
  rects.push({ x: 5, y: 12, w: 3, h: 3, fill: bodyDark });
  rects.push({ x: 8, y: 12, w: 3, h: 3, fill: bodyDark });

  // ─ Shoes ─
  rects.push({ x: 4, y: 15, w: 4, h: 1, fill: '#2D3436' });
  rects.push({ x: 8, y: 15, w: 4, h: 1, fill: '#2D3436' });

  // ─ Accessory ─
  switch (id.accessory) {
    case 'glasses':
      rects.push({ x: 5, y: 2, w: 3, h: 2, fill: '#2D3436', opacity: 0.3 });
      rects.push({ x: 8, y: 2, w: 3, h: 2, fill: '#2D3436', opacity: 0.3 });
      rects.push({ x: 8, y: 3, w: 1, h: 0.5, fill: '#636E72' }); // bridge
      break;
    case 'headphones':
      rects.push({ x: 4, y: 1, w: 1, h: 3, fill: '#636E72' });
      rects.push({ x: 11, y: 1, w: 1, h: 3, fill: '#636E72' });
      rects.push({ x: 5, y: 0, w: 6, h: 1, fill: '#636E72' }); // band
      break;
    case 'hat':
      rects.push({ x: 4, y: -1, w: 8, h: 2, fill: accent });
      rects.push({ x: 3, y: 1, w: 10, h: 1, fill: accent }); // brim
      break;
    case 'scarf':
      rects.push({ x: 4, y: 5, w: 8, h: 2, fill: accent });
      rects.push({ x: 4, y: 7, w: 2, h: 2, fill: accent }); // tail
      break;
    case 'bowtie':
      rects.push({ x: 6, y: 6, w: 1, h: 1, fill: accent });
      rects.push({ x: 7, y: 6, w: 2, h: 1, fill: '#2D3436' }); // knot
      rects.push({ x: 9, y: 6, w: 1, h: 1, fill: accent });
      break;
    case 'earring':
      rects.push({ x: 4, y: 3, w: 1, h: 1, fill: '#FFD700' });
      break;
    case 'bandana':
      rects.push({ x: 5, y: 1, w: 6, h: 1, fill: accent });
      rects.push({ x: 11, y: 1, w: 2, h: 2, fill: accent }); // tail
      break;
    case 'none':
      break;
  }

  return rects;
}

// ── Furniture SVG generators (enhanced with more detail) ──

export function deskSvg(color: string): string {
  return `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="2" y="10" width="36" height="4" fill="${color}" rx="1"/>
    <rect x="4" y="14" width="3" height="14" fill="${color}" opacity="0.7"/>
    <rect x="33" y="14" width="3" height="14" fill="${color}" opacity="0.7"/>
    <rect x="8" y="14" width="24" height="2" fill="${color}" opacity="0.4"/>
    <rect x="12" y="4" width="16" height="7" fill="#2D3436" rx="1"/>
    <rect x="13" y="5" width="14" height="5" fill="#0D1B2A"/>
    <rect x="14" y="6" width="12" height="3" fill="#74B9FF"/>
    <rect x="14" y="6" width="5" height="1" fill="#00FF88" opacity="0.6"/>
    <rect x="14" y="8" width="8" height="0.5" fill="#FFF" opacity="0.2"/>
    <rect x="18" y="11" width="4" height="1" fill="#636E72" opacity="0.5"/>
    <rect x="7" y="6" width="4" height="3" fill="#DFE6E9" rx="0.5"/>
    <rect x="8" y="7" width="2" height="1" fill="#636E72"/>
    <rect x="30" y="7" width="3" height="2" fill="#FFEAA7" opacity="0.6"/>
  </svg>`;
}

export function whiteboardSvg(): string {
  return `<svg viewBox="0 0 44 36" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="22" fill="#F5F6FA" rx="1" stroke="#B2BEC3" stroke-width="0.5"/>
    <rect x="8" y="5" width="10" height="1.5" fill="#FF6B6B" rx="0.5"/>
    <rect x="8" y="8" width="16" height="1.5" fill="#54A0FF" rx="0.5"/>
    <rect x="8" y="11" width="8" height="1.5" fill="#2ED573" rx="0.5"/>
    <rect x="8" y="14" width="12" height="1.5" fill="#FECA57" rx="0.5"/>
    <rect x="8" y="17" width="6" height="1.5" fill="#A29BFE" rx="0.5"/>
    <rect x="22" y="5" width="12" height="8" fill="#DFE6E9" rx="1"/>
    <rect x="24" y="7" width="3" height="4" fill="#FF6B6B" opacity="0.5"/>
    <rect x="28" y="9" width="3" height="2" fill="#54A0FF" opacity="0.5"/>
    <rect x="24" y="9" width="3" height="2" fill="#2ED573" opacity="0.5"/>
    <rect x="19" y="24" width="6" height="8" fill="#636E72"/>
    <rect x="16" y="32" width="12" height="2" fill="#636E72" rx="1"/>
    <circle cx="34" cy="5" r="1.5" fill="#FF6B6B"/>
    <circle cx="34" cy="9" r="1.5" fill="#2ED573"/>
    <circle cx="34" cy="13" r="1.5" fill="#54A0FF"/>
  </svg>`;
}

export function plantSvg(): string {
  return `<svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6" y="22" width="12" height="12" fill="#B2BEC3" rx="2"/>
    <rect x="7" y="23" width="10" height="10" fill="#95A5A6" rx="1"/>
    <rect x="10" y="16" width="4" height="7" fill="#27AE60"/>
    <ellipse cx="12" cy="10" rx="7" ry="7" fill="#2ED573"/>
    <ellipse cx="8" cy="13" rx="4" ry="4" fill="#00B894"/>
    <ellipse cx="16" cy="13" rx="4" ry="4" fill="#00B894"/>
    <ellipse cx="12" cy="6" rx="5" ry="5" fill="#55E6A5"/>
    <ellipse cx="9" cy="8" rx="2" ry="2" fill="#A3F5BD"/>
    <ellipse cx="14" cy="7" rx="1.5" ry="1.5" fill="#A3F5BD"/>
    <rect x="8" y="24" width="8" height="1" fill="#6D4C41" opacity="0.3"/>
  </svg>`;
}

export function coffeeSvg(): string {
  return `<svg viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="5" y="10" width="12" height="14" fill="#FFEAA7" rx="2"/>
    <rect x="17" y="13" width="4" height="6" fill="#FFEAA7" rx="2"/>
    <rect x="6" y="11" width="10" height="3" fill="#D68A4D"/>
    <rect x="7" y="12" width="8" height="1" fill="#E8A76C" opacity="0.5"/>
    <path d="M7 7 Q8 4 10 7 Q12 4 14 7" stroke="#B2BEC3" stroke-width="1.2" fill="none" opacity="0.6">
      <animate attributeName="d" values="M7 7 Q8 4 10 7 Q12 4 14 7;M7 6 Q8 3 10 6 Q12 3 14 6;M7 7 Q8 4 10 7 Q12 4 14 7" dur="3s" repeatCount="indefinite"/>
    </path>
    <rect x="3" y="24" width="16" height="2" fill="#DFE6E9" rx="1"/>
  </svg>`;
}

export function bookshelfSvg(): string {
  return `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="2" y="2" width="40" height="40" fill="#8B6F47" rx="2"/>
    <rect x="4" y="4" width="36" height="1" fill="#A0845C"/>
    <rect x="4" y="5" width="36" height="11" fill="#6D4C41"/>
    <rect x="4" y="18" width="36" height="11" fill="#6D4C41"/>
    <rect x="4" y="31" width="36" height="11" fill="#6D4C41"/>
    <rect x="4" y="16" width="36" height="2" fill="#8B6F47"/>
    <rect x="4" y="29" width="36" height="2" fill="#8B6F47"/>
    <rect x="6" y="6" width="5" height="9" fill="#FF6B6B" rx="0.5"/>
    <rect x="12" y="6" width="4" height="9" fill="#54A0FF" rx="0.5"/>
    <rect x="17" y="7" width="6" height="8" fill="#2ED573" rx="0.5"/>
    <rect x="24" y="6" width="3" height="9" fill="#FECA57" rx="0.5"/>
    <rect x="28" y="6" width="5" height="9" fill="#FF9F43" rx="0.5"/>
    <rect x="34" y="7" width="4" height="8" fill="#A29BFE" rx="0.5"/>
    <rect x="6" y="19" width="6" height="9" fill="#FF9FF3" rx="0.5"/>
    <rect x="13" y="19" width="4" height="9" fill="#48DBFB" rx="0.5"/>
    <rect x="18" y="20" width="5" height="8" fill="#FFEAA7" rx="0.5"/>
    <rect x="24" y="19" width="7" height="9" fill="#DFE6E9" rx="0.5"/>
    <rect x="32" y="20" width="6" height="8" fill="#636E72" rx="0.5"/>
    <rect x="7" y="32" width="4" height="9" fill="#E17055" rx="0.5"/>
    <rect x="12" y="33" width="6" height="8" fill="#00CEC9" rx="0.5"/>
    <rect x="19" y="32" width="3" height="9" fill="#FDCB6E" rx="0.5"/>
    <rect x="23" y="32" width="5" height="9" fill="#6C5CE7" rx="0.5"/>
    <rect x="29" y="33" width="4" height="8" fill="#E84393" rx="0.5"/>
    <rect x="34" y="32" width="5" height="9" fill="#00B894" rx="0.5"/>
  </svg>`;
}

export function monitorSvg(): string {
  return `<svg viewBox="0 0 36 32" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="3" y="2" width="30" height="18" fill="#2D3436" rx="2"/>
    <rect x="4" y="3" width="28" height="16" fill="#0D1B2A"/>
    <rect x="5" y="4" width="26" height="14" fill="#1A1A2E"/>
    <rect x="7" y="6" width="10" height="1" fill="#00FF88" opacity="0.8"/>
    <rect x="7" y="8" width="16" height="1" fill="#00FF88" opacity="0.5"/>
    <rect x="7" y="10" width="8" height="1" fill="#00FF88" opacity="0.6"/>
    <rect x="7" y="12" width="14" height="1" fill="#74B9FF" opacity="0.4"/>
    <rect x="7" y="14" width="6" height="1" fill="#FECA57" opacity="0.4"/>
    <rect x="22" y="6" width="7" height="10" fill="#16213E"/>
    <rect x="23" y="7" width="2" height="2" fill="#FF6B6B" opacity="0.6"/>
    <rect x="26" y="7" width="2" height="2" fill="#2ED573" opacity="0.6"/>
    <rect x="23" y="10" width="5" height="1" fill="#636E72" opacity="0.3"/>
    <rect x="14" y="20" width="8" height="3" fill="#636E72"/>
    <rect x="8" y="23" width="20" height="2" fill="#636E72" rx="1"/>
    <circle cx="18" cy="19" r="0.5" fill="#54A0FF"/>
  </svg>`;
}

// ── New furniture types ──

export function serverRackSvg(): string {
  return `<svg viewBox="0 0 28 44" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="2" y="2" width="24" height="40" fill="#2D3436" rx="1"/>
    <rect x="4" y="4" width="20" height="8" fill="#1A1A2E"/>
    <rect x="4" y="14" width="20" height="8" fill="#1A1A2E"/>
    <rect x="4" y="24" width="20" height="8" fill="#1A1A2E"/>
    <rect x="4" y="34" width="20" height="6" fill="#1A1A2E"/>
    <circle cx="8" cy="8" r="1.5" fill="#2ED573"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="8" cy="18" r="1.5" fill="#2ED573"><animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/></circle>
    <circle cx="8" cy="28" r="1.5" fill="#FECA57"><animate attributeName="opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="8" cy="37" r="1.5" fill="#2ED573"/>
    <rect x="12" y="6" width="10" height="1" fill="#636E72"/>
    <rect x="12" y="8" width="8" height="1" fill="#636E72"/>
    <rect x="12" y="16" width="10" height="1" fill="#636E72"/>
    <rect x="12" y="18" width="8" height="1" fill="#636E72"/>
    <rect x="12" y="26" width="10" height="1" fill="#636E72"/>
    <rect x="12" y="36" width="8" height="1" fill="#636E72"/>
  </svg>`;
}

export function cameraSvg(): string {
  return `<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="6" width="24" height="16" fill="#2D3436" rx="2"/>
    <circle cx="16" cy="14" r="6" fill="#636E72"/>
    <circle cx="16" cy="14" r="4" fill="#0D1B2A"/>
    <circle cx="16" cy="14" r="2" fill="#74B9FF" opacity="0.6"/>
    <rect x="6" y="8" width="4" height="2" fill="#FF6B6B" rx="1"/>
    <rect x="10" y="3" width="8" height="4" fill="#636E72" rx="1"/>
    <circle cx="25" cy="9" r="1" fill="#2ED573"><animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle>
    <rect x="12" y="22" width="8" height="4" fill="#636E72"/>
  </svg>`;
}

export function chartBoardSvg(): string {
  return `<svg viewBox="0 0 40 36" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="2" width="32" height="24" fill="#1A1A2E" rx="1"/>
    <rect x="6" y="4" width="28" height="20" fill="#0D1B2A"/>
    <rect x="8" y="18" width="4" height="4" fill="#FF6B6B"/>
    <rect x="14" y="14" width="4" height="8" fill="#54A0FF"/>
    <rect x="20" y="10" width="4" height="12" fill="#2ED573"/>
    <rect x="26" y="8" width="4" height="14" fill="#FECA57"/>
    <polyline points="10,16 16,12 22,8 28,6" stroke="#FF9FF3" stroke-width="1" fill="none"/>
    <circle cx="10" cy="16" r="1" fill="#FF9FF3"/>
    <circle cx="16" cy="12" r="1" fill="#FF9FF3"/>
    <circle cx="22" cy="8" r="1" fill="#FF9FF3"/>
    <circle cx="28" cy="6" r="1" fill="#FF9FF3"/>
    <rect x="17" y="26" width="6" height="6" fill="#636E72"/>
    <rect x="14" y="32" width="12" height="2" fill="#636E72" rx="1"/>
  </svg>`;
}

export function rugSvg(color: string): string {
  return `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="4" width="72" height="40" fill="${color}" opacity="0.15" rx="3"/>
    <rect x="8" y="8" width="64" height="32" fill="${color}" opacity="0.1" rx="2"/>
    <rect x="6" y="4" width="2" height="40" fill="${color}" opacity="0.2"/>
    <rect x="72" y="4" width="2" height="40" fill="${color}" opacity="0.2"/>
    <rect x="4" y="6" width="72" height="2" fill="${color}" opacity="0.2"/>
    <rect x="4" y="40" width="72" height="2" fill="${color}" opacity="0.2"/>
  </svg>`;
}

export function lampSvg(color: string): string {
  return `<svg viewBox="0 0 16 40" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="6" y="12" width="4" height="22" fill="#636E72"/>
    <ellipse cx="8" cy="8" rx="7" ry="8" fill="${color}" opacity="0.8"/>
    <ellipse cx="8" cy="8" rx="5" ry="6" fill="${color}" opacity="0.4"/>
    <ellipse cx="8" cy="36" rx="6" ry="3" fill="#636E72"/>
    <circle cx="8" cy="8" r="2" fill="#FFF" opacity="0.3">
      <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
}

export function couchSvg(color: string): string {
  return `<svg viewBox="0 0 56 28" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="8" width="48" height="14" fill="${color}" rx="3"/>
    <rect x="2" y="6" width="10" height="16" fill="${color}" rx="2" opacity="0.85"/>
    <rect x="44" y="6" width="10" height="16" fill="${color}" rx="2" opacity="0.85"/>
    <rect x="14" y="10" width="28" height="8" fill="${color}" opacity="0.6" rx="2"/>
    <rect x="6" y="22" width="4" height="4" fill="#636E72" rx="1"/>
    <rect x="46" y="22" width="4" height="4" fill="#636E72" rx="1"/>
    <rect x="16" y="12" width="10" height="4" fill="${color}" opacity="0.3" rx="1"/>
    <rect x="30" y="12" width="10" height="4" fill="${color}" opacity="0.3" rx="1"/>
  </svg>`;
}

// ── Additional furniture types for larger rooms ──

export function meetingTableSvg(color: string): string {
  return `<svg viewBox="0 0 64 44" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <ellipse cx="32" cy="22" rx="28" ry="14" fill="${color}" opacity="0.85"/>
    <ellipse cx="32" cy="20" rx="28" ry="14" fill="${color}"/>
    <ellipse cx="32" cy="20" rx="24" ry="11" fill="${color}" opacity="0.7"/>
    <rect x="29" y="30" width="6" height="12" fill="#636E72" rx="1"/>
    <circle cx="14" cy="16" r="3" fill="#DFE6E9"/>
    <circle cx="32" cy="10" r="3" fill="#DFE6E9"/>
    <circle cx="50" cy="16" r="3" fill="#DFE6E9"/>
    <circle cx="20" cy="26" r="3" fill="#DFE6E9"/>
    <circle cx="44" cy="26" r="3" fill="#DFE6E9"/>
    <rect x="12" y="18" width="6" height="1" fill="#B2BEC3" opacity="0.4"/>
    <rect x="40" y="14" width="8" height="1" fill="#B2BEC3" opacity="0.4"/>
  </svg>`;
}

export function waterCoolerSvg(): string {
  return `<svg viewBox="0 0 20 40" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="14" width="12" height="18" fill="#DFE6E9" rx="1"/>
    <rect x="5" y="15" width="10" height="8" fill="#74B9FF" opacity="0.4"/>
    <rect x="6" y="0" width="8" height="14" fill="#74B9FF" opacity="0.6" rx="2"/>
    <rect x="7" y="2" width="6" height="10" fill="#48DBFB" opacity="0.3"/>
    <circle cx="10" cy="26" r="2" fill="#FF6B6B"/>
    <circle cx="10" cy="30" r="2" fill="#54A0FF"/>
    <rect x="3" y="32" width="14" height="2" fill="#B2BEC3"/>
    <rect x="5" y="34" width="4" height="4" fill="#636E72"/>
    <rect x="11" y="34" width="4" height="4" fill="#636E72"/>
    <rect x="8" y="24" width="6" height="1" fill="#B2BEC3" opacity="0.3"/>
  </svg>`;
}

export function printerSvg(): string {
  return `<svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="8" width="28" height="14" fill="#DFE6E9" rx="2"/>
    <rect x="6" y="0" width="24" height="10" fill="#F5F6FA" rx="1"/>
    <rect x="8" y="2" width="20" height="6" fill="#FFF"/>
    <rect x="10" y="3" width="14" height="1" fill="#636E72" opacity="0.3"/>
    <rect x="10" y="5" width="10" height="1" fill="#636E72" opacity="0.2"/>
    <rect x="8" y="18" width="20" height="6" fill="#F5F6FA" rx="1"/>
    <rect x="10" y="20" width="16" height="2" fill="#FFF"/>
    <circle cx="28" cy="12" r="2" fill="#2ED573">
      <animate attributeName="opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite"/>
    </circle>
    <rect x="6" y="12" width="8" height="1.5" fill="#B2BEC3" rx="0.5"/>
  </svg>`;
}

export function stickyWallSvg(): string {
  return `<svg viewBox="0 0 52 40" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="2" y="2" width="48" height="36" fill="#B2BEC3" opacity="0.15" rx="2"/>
    <rect x="4" y="4" width="12" height="10" fill="#FECA57" rx="1"/>
    <rect x="5" y="6" width="8" height="1" fill="#636E72" opacity="0.3"/>
    <rect x="5" y="8" width="6" height="1" fill="#636E72" opacity="0.2"/>
    <rect x="18" y="4" width="12" height="10" fill="#FF6B6B" rx="1"/>
    <rect x="19" y="6" width="8" height="1" fill="#FFF" opacity="0.3"/>
    <rect x="19" y="8" width="5" height="1" fill="#FFF" opacity="0.2"/>
    <rect x="32" y="4" width="12" height="10" fill="#54A0FF" rx="1"/>
    <rect x="33" y="6" width="8" height="1" fill="#FFF" opacity="0.3"/>
    <rect x="33" y="8" width="6" height="1" fill="#FFF" opacity="0.2"/>
    <rect x="6" y="18" width="12" height="10" fill="#2ED573" rx="1"/>
    <rect x="7" y="20" width="8" height="1" fill="#636E72" opacity="0.3"/>
    <rect x="22" y="18" width="12" height="10" fill="#A29BFE" rx="1"/>
    <rect x="23" y="20" width="8" height="1" fill="#FFF" opacity="0.3"/>
    <rect x="36" y="18" width="12" height="10" fill="#FF9FF3" rx="1"/>
    <rect x="37" y="20" width="8" height="1" fill="#FFF" opacity="0.3"/>
    <rect x="10" y="30" width="12" height="8" fill="#FFEAA7" rx="1"/>
    <rect x="11" y="32" width="8" height="1" fill="#636E72" opacity="0.2"/>
    <rect x="28" y="30" width="12" height="8" fill="#FF9F43" rx="1"/>
    <rect x="29" y="32" width="8" height="1" fill="#FFF" opacity="0.2"/>
  </svg>`;
}

export function cabinetSvg(): string {
  return `<svg viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="2" y="2" width="24" height="36" fill="#8B6F47" rx="1"/>
    <rect x="4" y="4" width="20" height="10" fill="#6D4C41"/>
    <rect x="4" y="16" width="20" height="10" fill="#6D4C41"/>
    <rect x="4" y="28" width="20" height="8" fill="#6D4C41"/>
    <rect x="12" y="7" width="4" height="2" fill="#B2BEC3" rx="0.5"/>
    <rect x="12" y="19" width="4" height="2" fill="#B2BEC3" rx="0.5"/>
    <rect x="12" y="31" width="4" height="2" fill="#B2BEC3" rx="0.5"/>
    <rect x="4" y="14" width="20" height="2" fill="#8B6F47"/>
    <rect x="4" y="26" width="20" height="2" fill="#8B6F47"/>
  </svg>`;
}

export function projectorScreenSvg(): string {
  return `<svg viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="4" y="0" width="48" height="4" fill="#636E72" rx="1"/>
    <rect x="6" y="4" width="44" height="28" fill="#F5F6FA" rx="1"/>
    <rect x="8" y="6" width="40" height="24" fill="#FFF"/>
    <rect x="12" y="10" width="16" height="2" fill="#54A0FF" opacity="0.5"/>
    <rect x="12" y="14" width="24" height="2" fill="#636E72" opacity="0.2"/>
    <rect x="12" y="18" width="20" height="2" fill="#636E72" opacity="0.2"/>
    <rect x="12" y="22" width="12" height="2" fill="#2ED573" opacity="0.4"/>
    <rect x="32" y="10" width="12" height="14" fill="#DFE6E9" rx="1"/>
    <rect x="34" y="12" width="3" height="3" fill="#FF6B6B" opacity="0.4"/>
    <rect x="38" y="12" width="3" height="3" fill="#54A0FF" opacity="0.4"/>
    <rect x="34" y="16" width="3" height="3" fill="#2ED573" opacity="0.4"/>
    <rect x="38" y="16" width="3" height="3" fill="#FECA57" opacity="0.4"/>
    <rect x="25" y="32" width="6" height="6" fill="#636E72"/>
    <rect x="22" y="36" width="12" height="2" fill="#636E72" rx="1"/>
  </svg>`;
}
