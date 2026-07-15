const AVATAR_PALETTE = [
  { from: '#7DD3FC', to: '#38BDF8' }, // sky
  { from: '#FDE68A', to: '#FBBF24' }, // yellow
  { from: '#FDA4AF', to: '#FB7185' }, // coral
  { from: '#6EE7B7', to: '#34D399' }, // mint
  { from: '#C4B5FD', to: '#A78BFA' }, // lavender
  { from: '#FDBA74', to: '#FB923C' }, // peach
] as const;

const SIZES = {
  opponent: 40,
  hero: 48,
  list: 32,
} as const;

export type AvatarSize = keyof typeof SIZES;

function hashKey(key: string | number): number {
  const str = String(key);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name.charAt(0) || '?').toUpperCase();
}

interface PlayerAvatarProps {
  name: string;
  /** Prefer stable player id when available */
  playerKey?: string | number;
  size?: AvatarSize;
  active?: boolean;
  className?: string;
}

export function PlayerAvatar({
  name,
  playerKey,
  size = 'opponent',
  active = false,
  className = '',
}: PlayerAvatarProps) {
  const px = SIZES[size];
  const palette = AVATAR_PALETTE[hashKey(playerKey ?? name) % AVATAR_PALETTE.length];
  const letter = monogram(name);
  const fontSize = size === 'hero' ? 17 : size === 'opponent' ? 14 : 11;

  return (
    <div
      className={`relative shrink-0 rounded-full shadow-avatar ${
        active ? 'ring-2 ring-white/30' : ''
      } ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-semibold text-black/75 select-none"
        style={{
          background: `linear-gradient(145deg, ${palette.from} 0%, ${palette.to} 100%)`,
          fontSize,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        {letter}
      </div>
    </div>
  );
}
