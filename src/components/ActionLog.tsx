import { useEffect, useRef } from 'react';
import type { GameAction, Player } from '../types/poker';
import { actionColor, formatAction, streetLabel } from '../utils/format';

interface ActionLogProps {
  actions: GameAction[];
  players: Player[];
  maxItems?: number;
}

export function ActionLog({ actions, players, maxItems = 8 }: ActionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const recent = actions.slice(-maxItems);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [actions.length]);

  if (actions.length === 0) {
    return (
      <div className="text-[13px] text-offsuit-grey text-center py-2">
        Actions will appear here
      </div>
    );
  }

  let lastStreet = '';

  return (
    <div ref={scrollRef} className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
      {recent.map((action, i) => {
        const showStreetHeader = action.street !== lastStreet;
        lastStreet = action.street;
        const player = players.find((p) => p.id === action.playerId);

        return (
          <div key={`${action.timestamp}-${i}`}>
            {showStreetHeader && (
              <div className="inline-flex mt-1.5 mb-1 px-2.5 py-0.5 rounded-full bg-surface-raised text-xs font-medium text-offsuit-grey">
                {streetLabel(action.street)}
              </div>
            )}
            <div className={`text-[13px] ${actionColor(action.action)} ${action.playerId === 0 ? 'font-medium' : ''}`}>
              {formatAction(action, player)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
