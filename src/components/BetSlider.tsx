import { useCallback, useRef, useState } from 'react';

interface BetSliderProps {
  min: number;
  max: number;
  value: number;
  step: number;
  onChange: (value: number) => void;
  label?: string;
}

export function BetSlider({ min, max, value, step, onChange, label = 'Bet amount' }: BetSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isDragging, setIsDragging] = useState(false);

  const clamp = useCallback(
    (v: number) => {
      if (max <= min) return min;
      const snapped = Math.round(v / step) * step;
      return Math.min(max, Math.max(min, snapped));
    },
    [min, max, step],
  );

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || max <= min) return min;
      const rect = track.getBoundingClientRect();
      const pad = 16;
      const trackLeft = rect.left + pad;
      const trackWidth = rect.width - pad * 2;
      if (trackWidth <= 0) return min;
      const ratio = Math.min(1, Math.max(0, (clientX - trackLeft) / trackWidth));
      return clamp(min + ratio * (max - min));
    },
    [min, max, clamp],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (max <= min) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    onChangeRef.current(valueFromClientX(e.clientX));

    const track = e.currentTarget;
    const pointerId = e.pointerId;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      onChangeRef.current(valueFromClientX(ev.clientX));
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      try {
        track.releasePointerCapture(pointerId);
      } catch {
        // Already released
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const nudge = (delta: number) => onChange(clamp(value + delta));

  if (max <= min) {
    return (
      <div className="text-center py-2">
        <div className="text-[32px] font-semibold text-white tabular-nums tracking-tight">${value}</div>
        <div className="text-[10px] text-offsuit-grey mt-0.5">{label}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => nudge(-step)}
          disabled={value <= min}
          className="offsuit-circle disabled:opacity-30 text-xl font-light"
          aria-label="Decrease bet"
        >
          −
        </button>

        <div className="text-center min-w-[100px]">
          <div
            className={`text-[32px] font-semibold tabular-nums tracking-tight transition-transform ${
              isDragging ? 'scale-105' : ''
            } text-white`}
          >
            ${value}
          </div>
          <div className="text-[10px] text-offsuit-grey mt-0.5">{label}</div>
        </div>

        <button
          type="button"
          onClick={() => nudge(step)}
          disabled={value >= max}
          className="offsuit-circle disabled:opacity-30 text-xl font-light"
          aria-label="Increase bet"
        >
          +
        </button>
      </div>

      <div
        ref={trackRef}
        className="relative h-14 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className="absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 rounded-full bg-surface-raised overflow-hidden pointer-events-none">
          <div
            className={`h-full rounded-full bg-white ${
              isDragging ? '' : 'transition-[width] duration-100'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-card flex items-center justify-center z-10 pointer-events-none ${
            isDragging ? 'scale-110' : 'transition-transform duration-100'
          }`}
          style={{ left: `calc(16px + (100% - 32px) * ${pct / 100})` }}
        />

        <div className="absolute bottom-0 left-4 text-[10px] text-offsuit-muted tabular-nums pointer-events-none">${min}</div>
        <div className="absolute bottom-0 right-4 text-[10px] text-offsuit-muted tabular-nums pointer-events-none">${max}</div>
      </div>
    </div>
  );
}
