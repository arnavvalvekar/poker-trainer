import { useGameStore } from '../store/game-store';
import { ActionButtons } from './ActionButtons';
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
  const canSkipHand = Boolean(
    hero?.folded && state.phase !== 'waiting' && state.phase !== 'hand-complete',
  );
  const playerNames = new Map(state.players.map((p) => [p.id, p.name]));
  const boardVisible = isShowdown ? state.board.length : visibleBoardCount;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black text-white safe-area">
      <header className="flex items-center justify-between gap-3 px-5 py-3 sticky top-0 z-30 bg-black/90 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold tracking-tight lowercase">
            offsuit <span className="text-offsuit-grey font-medium">trainer</span>
          </h1>
          {message && (
            <p className="offsuit-chip mt-1.5 max-w-full truncate">{message}</p>
          )}
        </div>
        <button
          onClick={toggleHistory}
          className="ml-1 offsuit-pill !h-9 !px-4 !text-[13px] !font-medium shrink-0"
        >
          History
          {handHistory.length > 0 && (
            <span className="ml-1.5 bg-white/15 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {handHistory.length}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 flex flex-col px-4 py-2 min-h-0 overflow-y-auto">
        {/* Offsuit table: opponents → board/pot → hero → result modules */}
        <div className="flex flex-col flex-1 min-h-[320px] max-h-[58dvh] gap-4">
          {isInHand && opponents.length > 0 && (
            <div className="flex justify-center gap-2 sm:gap-2.5 pt-1 overflow-x-auto scrollbar-thin">
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

          <div className="relative flex-1 flex flex-col items-center justify-center gap-3 min-h-[160px]">
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
        ) : canSkipHand ? (
          <button
            onClick={() => useGameStore.getState().skipHand()}
            className="w-full h-[52px] bg-surface text-white rounded-full font-semibold text-[15px] touch-manipulation transition-all active:scale-[0.98] ring-1 ring-white/15"
          >
            Skip to result
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface text-offsuit-grey text-sm">
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
