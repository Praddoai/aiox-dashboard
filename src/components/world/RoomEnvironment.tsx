import type { DomainId } from './world-layout';
import { useDomains } from './DomainContext';

interface RoomEnvironmentProps {
  domain: DomainId;
  tileSize: number;
  roomWidth: number;
}

// Wall configuration
const WALL_HEIGHT = 100;
const WINDOW_W = 72;
const WINDOW_H = 48;
const WINDOW_GAP = 160;

export function RoomEnvironment({ domain, roomWidth }: RoomEnvironmentProps) {
  const domains = useDomains();
  const d = domains[domain];

  // Darken the domain color for wall
  const wallColor = darkenHex(d.tileColor, 0.35);
  const wallDark = darkenHex(d.tileColor, 0.5);
  const trimColor = darkenHex(d.tileColor, 0.25);

  // Calculate window positions
  const windowCount = Math.floor((roomWidth - 120) / WINDOW_GAP);
  const startX = (roomWidth - (windowCount - 1) * WINDOW_GAP) / 2;
  const windows = Array.from({ length: windowCount }, (_, i) => ({
    x: startX + i * WINDOW_GAP - WINDOW_W / 2,
    y: 24,
  }));

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ zIndex: 1 }}>
      {/* Main wall */}
      <svg width={roomWidth} height={WALL_HEIGHT + 20} style={{ imageRendering: 'pixelated' }}>
        {/* Wall base */}
        <rect x="0" y="0" width={roomWidth} height={WALL_HEIGHT} fill={wallColor} />

        {/* Subtle brick pattern */}
        {Array.from({ length: Math.ceil(roomWidth / 32) }).map((_, col) =>
          Array.from({ length: 3 }).map((_, row) => (
            <rect
              key={`brick-${col}-${row}`}
              x={col * 32 + (row % 2) * 16}
              y={row * 28 + 4}
              width={30}
              height={26}
              fill="transparent"
              stroke={wallDark}
              strokeWidth="0.5"
              opacity={0.15}
              rx="1"
            />
          )),
        )}

        {/* Windows */}
        {windows.map((win, i) => (
          <g key={`win-${i}`}>
            {/* Window frame (outer) */}
            <rect
              x={win.x - 4}
              y={win.y - 4}
              width={WINDOW_W + 8}
              height={WINDOW_H + 8}
              fill={wallDark}
              rx="2"
            />
            {/* Window glass */}
            <rect
              x={win.x}
              y={win.y}
              width={WINDOW_W}
              height={WINDOW_H}
              rx="1"
            >
              {/* Glass gradient based on domain */}
            </rect>
            <defs>
              <linearGradient id={`win-grad-${domain}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.tileColor} stopOpacity="0.25" />
                <stop offset="50%" stopColor="#87CEEB" stopOpacity="0.3" />
                <stop offset="100%" stopColor={d.tileColor} stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect
              x={win.x}
              y={win.y}
              width={WINDOW_W}
              height={WINDOW_H}
              fill={`url(#win-grad-${domain}-${i})`}
              rx="1"
            />
            {/* Window cross bars */}
            <line
              x1={win.x + WINDOW_W / 2}
              y1={win.y}
              x2={win.x + WINDOW_W / 2}
              y2={win.y + WINDOW_H}
              stroke={wallDark}
              strokeWidth="2"
            />
            <line
              x1={win.x}
              y1={win.y + WINDOW_H / 2}
              x2={win.x + WINDOW_W}
              y2={win.y + WINDOW_H / 2}
              stroke={wallDark}
              strokeWidth="2"
            />
            {/* Window sill */}
            <rect
              x={win.x - 6}
              y={win.y + WINDOW_H + 2}
              width={WINDOW_W + 12}
              height={5}
              fill={trimColor}
              rx="1"
            />
            {/* Light glow from window */}
            <rect
              x={win.x + 4}
              y={win.y + WINDOW_H + 8}
              width={WINDOW_W - 8}
              height={30}
              fill={d.tileColor}
              opacity="0.04"
              rx="4"
            />
          </g>
        ))}

        {/* Baseboard trim */}
        <rect x="0" y={WALL_HEIGHT - 6} width={roomWidth} height={6} fill={trimColor} />
        <rect x="0" y={WALL_HEIGHT} width={roomWidth} height={2} fill={wallDark} opacity="0.3" />

        {/* Wall shadow on floor */}
        <rect x="0" y={WALL_HEIGHT} width={roomWidth} height={18} fill="url(#wallShadow)" />
        <defs>
          <linearGradient id="wallShadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wall-mounted clock */}
      <div
        className="absolute"
        style={{ right: 40, top: 30 }}
      >
        <WallClock color={d.tileColor} />
      </div>

      {/* Domain sign/plaque */}
      <div
        className="absolute"
        style={{ left: 30, top: 32 }}
      >
        <DomainPlaque domain={domain} />
      </div>

      {/* Side wall accents (left) */}
      <div
        className="absolute left-0 top-0 w-3 pointer-events-none"
        style={{
          height: '100%',
          background: `linear-gradient(to right, ${wallDark}44, transparent)`,
          zIndex: 0,
        }}
      />
      {/* Side wall accents (right) */}
      <div
        className="absolute right-0 top-0 w-3 pointer-events-none"
        style={{
          height: '100%',
          background: `linear-gradient(to left, ${wallDark}44, transparent)`,
          zIndex: 0,
        }}
      />
    </div>
  );
}

/** Pixel-art wall clock */
function WallClock({ color }: { color: string }) {
  // Get current hour for clock hand position
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const hourAngle = (hours + minutes / 60) * 30 - 90;
  const minuteAngle = minutes * 6 - 90;

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ imageRendering: 'pixelated' }}>
      {/* Clock body */}
      <circle cx="14" cy="14" r="13" fill="#2C2C2C" stroke="#444" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="11" fill="#1a1a1a" />
      {/* Hour markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1={14 + 8 * Math.cos((deg - 90) * Math.PI / 180)}
          y1={14 + 8 * Math.sin((deg - 90) * Math.PI / 180)}
          x2={14 + 10 * Math.cos((deg - 90) * Math.PI / 180)}
          y2={14 + 10 * Math.sin((deg - 90) * Math.PI / 180)}
          stroke="#555"
          strokeWidth="1"
        />
      ))}
      {/* Hour hand */}
      <line
        x1="14" y1="14"
        x2={14 + 6 * Math.cos(hourAngle * Math.PI / 180)}
        y2={14 + 6 * Math.sin(hourAngle * Math.PI / 180)}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="14" y1="14"
        x2={14 + 8 * Math.cos(minuteAngle * Math.PI / 180)}
        y2={14 + 8 * Math.sin(minuteAngle * Math.PI / 180)}
        stroke="#ccc"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="14" cy="14" r="1.5" fill={color} />
    </svg>
  );
}

/** Domain name plaque on wall */
function DomainPlaque({ domain }: { domain: DomainId }) {
  const domains = useDomains();
  const d = domains[domain];
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded"
      style={{
        background: 'rgba(0,0,0,0.5)',
        border: `1px solid ${d.tileColor}44`,
      }}
    >
      <d.icon size={10} />
      <span
        className="text-[8px] font-bold uppercase tracking-wider"
        style={{ color: d.tileColor, fontFamily: 'monospace' }}
      >
        {d.label}
      </span>
    </div>
  );
}

/** Darken a hex color by a factor (0-1) */
function darkenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
}
