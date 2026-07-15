import type { StoredHand } from '../storage/hand-history';

export interface AdvancedStats {
  // EV-adjusted results
  evAdjusted: {
    actualProfit: number;
    expectedProfit: number;
    luck: number;            // Difference (running hot/cold)
    skillComponent: number;  // EV-adjusted performance
  };
  
  // Showdown analysis
  showdown: {
    redLine: number;         // Profit from folds (non-showdown)
    blueLine: number;        // Profit from showdowns
    showdownWinnings: number;
    nonShowdownWinnings: number;
  };
  
  // Variance metrics
  variance: {
    standardDeviation: number;
    biggestWin: number;
    biggestLoss: number;
    currentStreak: { type: 'win' | 'loss'; count: number };
    longestWinStreak: number;
    longestLossStreak: number;
  };
  
  // Hand reading accuracy
  handReading: {
    correctFolds: number;     // Folded to better hand
    incorrectFolds: number;   // Folded to worse hand
    correctCalls: number;     // Called and won
    incorrectCalls: number;   // Called and lost
    accuracy: number;
  };
}

/**
 * Calculate advanced statistics including EV adjustments,
 * red line/blue line, variance, and hand reading accuracy
 */
export function calculateAdvancedStats(hands: StoredHand[], bigBlind = 2): AdvancedStats {
  if (hands.length === 0) {
    return createEmptyAdvancedStats();
  }

  let actualProfit = 0;
  let expectedProfit = 0;
  
  let showdownWinnings = 0;
  let nonShowdownWinnings = 0;
  
  const results: number[] = [];
  let biggestWin = 0;
  let biggestLoss = 0;
  
  let currentStreak = 0;
  let currentStreakType: 'win' | 'loss' = 'win';
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  
  let correctFolds = 0;
  let incorrectFolds = 0;
  let correctCalls = 0;
  let incorrectCalls = 0;

  for (let i = 0; i < hands.length; i++) {
    const hand = hands[i];
    const profit = hand.stackChange;
    
    actualProfit += profit;
    results.push(profit);
    
    // Track biggest win/loss
    if (profit > biggestWin) biggestWin = profit;
    if (profit < biggestLoss) biggestLoss = profit;
    
    // Calculate expected profit from feedback (average EV of chosen actions)
    let handExpectedValue = 0;
    for (const feedback of hand.feedback) {
      handExpectedValue += feedback.ev.chosen;
    }
    expectedProfit += handExpectedValue;
    
    // Determine if went to showdown
    const heroActions = hand.actions.filter(a => a.playerId === 0);
    const wentToShowdown = heroActions.some(a => a.street === 'river') && 
                          !heroActions.some(a => a.action === 'fold');
    
    if (wentToShowdown) {
      showdownWinnings += profit;
    } else {
      nonShowdownWinnings += profit;
    }
    
    // Track streaks
    if (profit > 0) {
      if (currentStreakType === 'win') {
        currentStreak++;
      } else {
        if (currentStreak > longestLossStreak) {
          longestLossStreak = currentStreak;
        }
        currentStreak = 1;
        currentStreakType = 'win';
      }
      if (currentStreak > longestWinStreak) {
        longestWinStreak = currentStreak;
      }
    } else if (profit < 0) {
      if (currentStreakType === 'loss') {
        currentStreak++;
      } else {
        if (currentStreak > longestWinStreak) {
          longestWinStreak = currentStreak;
        }
        currentStreak = 1;
        currentStreakType = 'loss';
      }
      if (currentStreak > longestLossStreak) {
        longestLossStreak = currentStreak;
      }
    }
    
    // Hand reading accuracy (simplified heuristic)
    // If we folded and lost a small amount, likely correct fold
    // If we folded and would have won (hand.result === 'loss' but we folded early), incorrect
    const foldedEarly = heroActions.some(a => a.action === 'fold' && a.street === 'preflop');
    const foldedLate = heroActions.some(a => a.action === 'fold' && a.street !== 'preflop');
    
    if (foldedEarly && profit >= -bigBlind) {
      correctFolds++;
    } else if (foldedLate && profit < -bigBlind * 2) {
      incorrectFolds++;
    }
    
    if (hand.result === 'win' && wentToShowdown) {
      correctCalls++;
    } else if (hand.result === 'loss' && wentToShowdown) {
      incorrectCalls++;
    }
  }

  // Calculate standard deviation
  const mean = actualProfit / hands.length;
  const squaredDiffs = results.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / hands.length;
  const standardDeviation = Math.sqrt(variance);
  
  const luck = actualProfit - expectedProfit;
  const skillComponent = expectedProfit;
  
  const totalAccuracyActions = correctFolds + incorrectFolds + correctCalls + incorrectCalls;
  const accuracy = totalAccuracyActions > 0
    ? (correctFolds + correctCalls) / totalAccuracyActions
    : 0;

  return {
    evAdjusted: {
      actualProfit,
      expectedProfit,
      luck,
      skillComponent,
    },
    showdown: {
      redLine: nonShowdownWinnings,
      blueLine: showdownWinnings,
      showdownWinnings,
      nonShowdownWinnings,
    },
    variance: {
      standardDeviation,
      biggestWin,
      biggestLoss,
      currentStreak: { type: currentStreakType, count: currentStreak },
      longestWinStreak,
      longestLossStreak,
    },
    handReading: {
      correctFolds,
      incorrectFolds,
      correctCalls,
      incorrectCalls,
      accuracy,
    },
  };
}

function createEmptyAdvancedStats(): AdvancedStats {
  return {
    evAdjusted: {
      actualProfit: 0,
      expectedProfit: 0,
      luck: 0,
      skillComponent: 0,
    },
    showdown: {
      redLine: 0,
      blueLine: 0,
      showdownWinnings: 0,
      nonShowdownWinnings: 0,
    },
    variance: {
      standardDeviation: 0,
      biggestWin: 0,
      biggestLoss: 0,
      currentStreak: { type: 'win', count: 0 },
      longestWinStreak: 0,
      longestLossStreak: 0,
    },
    handReading: {
      correctFolds: 0,
      incorrectFolds: 0,
      correctCalls: 0,
      incorrectCalls: 0,
      accuracy: 0,
    },
  };
}
