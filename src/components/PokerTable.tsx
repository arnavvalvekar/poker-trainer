import { useGameStore } from '../store/game-store';
import { ActionButtons } from './ActionButtons';
import { ActionLog } from './ActionLog';
import { ActionBanner } from './ActionBanner';
import { HandHistoryPanel } from './HandHistoryPanel';
import { HandResultBanner } from './HandResultBanner';
import { FeedbackPanel } from './FeedbackPanel';
import { HeroZone } from './HeroZone';
import { OpponentSeat } from './OpponentSeat';
import { BoardCards, PotDisplay } from './PotDisplay';
import { getTotalPot } from '../engine/pot';

export function PokerTable() {
  const {
    state,
    message,
    lastSummary,
    lastFeedback,
    isAnalyzing,
    isAnimating,
    actionBanner,
    visibleBoardCount,
    handHistory,
    showHistory,
    toggleHistory,
    selectHistoryHand,
  } = useGameStore();

  const pot = getTotalPot(state.pots) ||
    state.players.reduce((sum, p) => sum + p.totalBetThisHand, 0);
  const hero = state.players.find((p) => p.isHero);
  const opponents = state.players.filter((p) => !p.isHero);
  const isHeroTurn = hero &&
    state.currentPlayerIndex === hero.id &&
    state.phase !== 'hand-complete' &&
    state.phase !== 'waiting' &&
    !isAnimating;

  const isInHand = state.phase !== 'waiting';
  const isShowdown = state.phase === 'hand-complete' || state.phase === 'showdown';
  const playerNames = new Map(state.players.map((p) => [p.id, p.name]));
  const boardVisible = isShowdown ? state.board.length : visibleBoardCount;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black text-white safe-area">
      <header className="flex items-center justify-between px-5 py-3 sticky top-0 z-30 bg-black/90 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>♠</span>
            <h1 className="text-[17px] font-semibold tracking-tight">offsuit trainer</h1>
          </div>
          <p className="text-xs text-offsuit-grey truncate mt-0.5 transition-all duration-300">{message}</p>
        </div>
        <button
          onClick={toggleHistory}
          className="ml-3 offsuit-pill !h-9 !px-4 !text-xs !font-medium"
        >
          History
          {handHistory.length > 0 && (
            <span className="ml-1.5 bg-white/15 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {handHistory.length}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 flex flex-col px-4 py-2 min-h-0 overflow-y-auto">
        {/* Offsuit-style table: opponent row → board → hero zone */}
        <div className="flex flex-col flex-1 min-h-[300px] max-h-[52dvh] gap-3">
          {isInHand && opponents.length > 0 && (
            <div className="flex justify-center gap-1.5 sm:gap-2 pt-1 overflow-x-auto scrollbar-thin">
              {opponents.map((player) => (
                <OpponentSeat
                  key={player.id}
                  player={player}
                  isActive={
                    state.currentPlayerIndex === player.id &&
                    !isShowdown &&
                    state.phase !== 'waiting'
                  }
                  isDealer={state.dealerIndex === player.id && isInHand}
                  revealAtShowdown={isShowdown}
                />
              ))}
            </div>
          )}

          <div className="relative flex-1 flex flex-col items-center justify-center gap-2 min-h-[140px]">
            <ActionBanner message={actionBanner} />
            <BoardCards board={state.board} visibleCount={boardVisible} />
            {isInHand && <PotDisplay amount={pot} street={state.street} />}
          </div>

          {hero && isInHand && (
            <HeroZone
              player={hero}
              isActive={
                state.currentPlayerIndex === hero.id &&
                !isShowdown &&
                state.phase !== 'waiting'
              }
              isDealer={state.dealerIndex === hero.id && isInHand}
              showCards={isInHand}
            />
          )}
        </div>

        {isInHand && (
          <div className="mt-2 px-3 py-2 offsuit-module transition-all duration-300">
            <ActionLog actions={state.actions} players={state.players} />
          </div>
        )}

        {lastSummary && isShowdown && (
          <HandResultBanner summary={lastSummary} playerNames={playerNames} />
        )}

        {(isAnalyzing || lastFeedback.length > 0) && isShowdown && (
          <FeedbackPanel
            feedback={lastFeedback}
            isLoading={isAnalyzing}
            bigBlind={state.config.bigBlind}
          />
        )}
      </div>

      <footer className="px-5 py-3 border-t border-white/5 bg-black/95 backdrop-blur-sm safe-area-bottom">
        {state.phase === 'waiting' || state.phase === 'hand-complete' ? (
          <button
            onClick={() => useGameStore.getState().startHand()}
            disabled={!useGameStore.getState().gtoLoaded || isAnimating}
            className="w-full h-[52px] bg-white text-black disabled:bg-surface disabled:text-offsuit-muted rounded-full font-semibold text-[15px] touch-manipulation transition-all active:scale-[0.98]"
          >
            {!useGameStore.getState().gtoLoaded
              ? 'Loading...'
              : isAnimating
                ? 'Please wait...'
                : state.phase === 'waiting'
                  ? 'Deal hand'
                  : 'Next hand'}
          </button>
        ) : isHeroTurn ? (
          <ActionButtons />
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2.5 text-offsuit-grey text-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce-dot" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce-dot" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce-dot" style={{ animationDelay: '300ms' }} />
              </span>
              {state.players[state.currentPlayerIndex]?.name} is thinking...
            </div>
          </div>
        )}
      </footer>

      <HandHistoryPanel
        history={handHistory}
        isOpen={showHistory}
        onClose={toggleHistory}
        onSelect={(num) => {
          selectHistoryHand(num);
          toggleHistory();
        }}
        selectedHand={lastSummary?.handNumber}
      />
    </div>
  );
}
