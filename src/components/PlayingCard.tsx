import type { Card, Suit } from '../types/poker';
import type { CSSProperties } from 'react';

const SUIT_PATHS: Record<Suit, string> = {
  s: 'M12 2C9 6 6 8 6 12c0 3.3 2.7 6 6 6s6-2.7 6-6c0-4-3-6-6-10z',
  h: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  d: 'M12 2L22 12 12 22 2 12z',
  c: 'M12 2c-2 0-3.5 1.5-3.5 3.5S10 9 12 9s3.5-1.5 3.5-3.5S14 2 12 2zm-5 8c-2 0-3.5 1.5-3.5 3.5S5 17 7 17s3.5-1.5 3.5-3.5S9 10 7 10zm10 0c-2 0-3.5 1.5-3.5 3.5S15 17 17 17s3.5-1.5 3.5-3.5S19 10 17 10zm-5 5c-2 0-3.5 1.5-3.5 3.5S10 22 12 22s3.5-1.5 3.5-3.5S14 17 12 17z',
};

const RED_SUITS: Suit[] = ['h', 'd'];

const RANK_DISPLAY: Record<string, string> = {
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
};

function displayRank(rank: string): string {
  return RANK_DISPLAY[rank] ?? rank;
}

function rankAriaLabel(rank: string, suit: Suit): string {
  const names: Record<string, string> = {
    T: 'Ten', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace',
  };
  const suitNames: Record<Suit, string> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
  const rankName = names[rank] ?? rank;
  return `${rankName} of ${suitNames[suit]}`;
}

const SIZES = {
  sm: { w: 46, h: 64, rank: 12, suit: 15, rx: 9 },
  md: { w: 54, h: 76, rank: 14, suit: 19, rx: 11 },
  lg: { w: 68, h: 96, rank: 17, suit: 26, rx: 12 },
};

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
  delay?: number;
  style?: CSSProperties;
}

export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  className = '',
  animate = false,
  delay = 0,
  style,
}: PlayingCardProps) {
  const { w, h, rank: rankSize, suit: suitSize, rx } = SIZES[size];

  if (faceDown) {
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 48 68"
        className={`drop-shadow-card ${animate ? 'animate-card-deal' : ''} ${className}`}
        style={{ ...(animate ? { animationDelay: `${delay}ms` } : undefined), ...style }}
        aria-label="Face down card"
      >
        <defs>
          <pattern id={`cardBackStripe-${size}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#F2F2F7" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C7C7CC" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x="1" y="1" width="46" height="66" rx={rx} fill="#F2F2F7" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        <rect x="4" y="4" width="40" height="60" rx={rx - 2} fill={`url(#cardBackStripe-${size})`} />
      </svg>
    );
  }

  const rank = card[0];
  const suit = card[1] as Suit;
  const isRed = RED_SUITS.includes(suit);
  const color = isRed ? '#FF3B30' : '#1C1C1E';

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 48 68"
      className={`drop-shadow-card ${animate ? 'animate-card-deal' : ''} ${className}`}
      style={{ ...(animate ? { animationDelay: `${delay}ms` } : undefined), ...style }}
      aria-label={rankAriaLabel(rank, suit)}
    >
      <rect x="1" y="1" width="46" height="66" rx={rx} fill="white" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      <text
        x="7"
        y="17"
        fontSize={rank === 'T' ? rankSize - 2 : rankSize}
        fontWeight="700"
        fill={color}
        fontFamily="Georgia, Times New Roman, serif"
      >
        {displayRank(rank)}
      </text>
      <g transform="translate(7, 21)" fill={color}>
        <path d={SUIT_PATHS[suit]} transform={`scale(${suitSize / 24})`} />
      </g>
      <text
        x="41"
        y="61"
        fontSize={rank === 'T' ? rankSize - 2 : rankSize}
        fontWeight="700"
        fill={color}
        fontFamily="Georgia, Times New Roman, serif"
        textAnchor="end"
        transform="rotate(180 41 61)"
      >
        {displayRank(rank)}
      </text>
      <g transform="translate(30, 44) rotate(180)" fill={color} opacity="0.25">
        <path d={SUIT_PATHS[suit]} transform={`scale(${suitSize / 24})`} />
      </g>
    </svg>
  );
}
