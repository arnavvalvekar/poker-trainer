import { formatMoney } from '../utils/format';

interface ChipStackProps {
  amount: number;
  className?: string;
  animate?: boolean;
}

export function ChipStack({ amount, className = '', animate = false }: ChipStackProps) {
  if (amount <= 0) return null;

  const chipCount = Math.min(3, Math.max(1, Math.ceil(amount / 20)));

  return (
    <div
      className={`flex flex-col items-center ${animate ? 'animate-chip-bet' : ''} ${className}`}
    >
      <div className="relative flex items-end justify-center" style={{ height: chipCount * 4 + 16 }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <div
            key={i}
            className="absolute w-7 h-7 rounded-full border border-white/20 bg-surface-raised shadow-card"
            style={{ bottom: i * 4, zIndex: i }}
          >
            <div className="w-full h-full rounded-full bg-surface-overlay flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border border-white/10" />
            </div>
          </div>
        ))}
      </div>
      <span className="mt-0.5 text-[10px] font-semibold text-white tabular-nums whitespace-nowrap">
        {formatMoney(amount)}
      </span>
    </div>
  );
}
