import type { GameAction } from '../types/poker';
import type { StoredHand } from '../storage/hand-history';
import type { HeroStats } from './types';

const HERO_PLAYER_ID = 0; // Hero is always player 0

/**
 * Calculate comprehensive hero statistics from stored hand history
 */
export function calculateHeroStats(hands: StoredHand[], bigBlind = 2): HeroStats {
  if (hands.length === 0) {
    return createEmptyStats();
  }

  let vpipHands = 0;
  let pfrHands = 0;
  let threeBets = 0;
  let threeBetOpportunities = 0;
  let foldTo3Bets = 0;
  let foldTo3BetOpportunities = 0;
  
  let cbets = 0;
  let cbetOpportunities = 0;
  let foldToCbets = 0;
  let foldToCbetOpportunities = 0;
  
  let wentToShowdown = 0;
  let sawFlop = 0;
  let wonAtShowdown = 0;
  let wsdOpportunities = 0;
  
  let aggressiveActions = 0;
  let passiveActions = 0;
  
  let totalProfit = 0;

  for (const hand of hands) {
    const heroActions = hand.actions.filter(a => a.playerId === HERO_PLAYER_ID);
    const allPreflopActions = hand.actions.filter(a => a.street === 'preflop');
    const allFlopActions = hand.actions.filter(a => a.street === 'flop');
    
    totalProfit += hand.stackChange;

    // VPIP: Did hero voluntarily put money in pot preflop (not counting blinds)?
    const heroPreflopActions = heroActions.filter(a => a.street === 'preflop');
    const voluntaryAction = heroPreflopActions.find(a => 
      a.action === 'call' || 
      a.action === 'bet' || 
      a.action === 'raise'
    );
    if (voluntaryAction) {
      vpipHands++;
    }

    // PFR: Did hero raise preflop?
    const preflopRaise = heroPreflopActions.find(a => 
      a.action === 'raise' || 
      a.action === 'bet'
    );
    if (preflopRaise) {
      pfrHands++;
    }

    // 3-bet: Did hero 3-bet when facing a raise?
    const firstPreflopRaise = findFirstRaiseNotByHero(allPreflopActions);
    if (firstPreflopRaise) {
      // Hero faced a raise
      const heroActionsAfterRaise = heroPreflopActions.filter(
        a => a.timestamp > firstPreflopRaise.timestamp
      );
      
      if (heroActionsAfterRaise.length > 0) {
        threeBetOpportunities++;
        
        const heroReraised = heroActionsAfterRaise.find(a => 
          a.action === 'raise' || a.action === 'bet'
        );
        
        if (heroReraised) {
          threeBets++;
        }
      }
    }

    // Fold to 3-bet: Did hero fold when facing a 3-bet?
    const heroWasFirstRaiser = heroPreflopActions.some(a => 
      a.action === 'raise' || a.action === 'bet'
    );
    
    if (heroWasFirstRaiser && preflopRaise) {
      // Find if someone reraised hero
      const reraiseAfterHero = allPreflopActions.find(a =>
        a.playerId !== HERO_PLAYER_ID &&
        a.timestamp > preflopRaise.timestamp &&
        (a.action === 'raise' || a.action === 'bet')
      );
      
      if (reraiseAfterHero) {
        foldTo3BetOpportunities++;
        
        const heroResponseToReraise = heroPreflopActions.find(a =>
          a.timestamp > reraiseAfterHero.timestamp
        );
        
        if (heroResponseToReraise?.action === 'fold') {
          foldTo3Bets++;
        }
      }
    }

    // C-bet: Did hero bet flop after raising preflop?
    if (heroWasFirstRaiser && allFlopActions.length > 0) {
      cbetOpportunities++;
      
      const heroFlopActions = heroActions.filter(a => a.street === 'flop');
      const heroCbet = heroFlopActions.find(a => 
        a.action === 'bet' || a.action === 'raise'
      );
      
      if (heroCbet) {
        cbets++;
      }
    }

    // Fold to C-bet: Did hero fold to opponent's c-bet?
    const opponentWasPreflopRaiser = findFirstRaiseNotByHero(allPreflopActions) !== null;
    
    if (opponentWasPreflopRaiser && allFlopActions.length > 0) {
      const opponentFlopBet = allFlopActions.find(a =>
        a.playerId !== HERO_PLAYER_ID &&
        (a.action === 'bet' || a.action === 'raise')
      );
      
      if (opponentFlopBet) {
        const heroFlopActions = heroActions.filter(a => a.street === 'flop');
        const heroResponseToCbet = heroFlopActions.find(a =>
          a.timestamp > opponentFlopBet.timestamp
        );
        
        if (heroResponseToCbet) {
          foldToCbetOpportunities++;
          
          if (heroResponseToCbet.action === 'fold') {
            foldToCbets++;
          }
        }
      }
    }

    // WTSD: Did hero see flop and go to showdown?
    const heroSawFlop = heroActions.some(a => 
      a.street === 'flop' || a.street === 'turn' || a.street === 'river'
    );
    
    if (heroSawFlop) {
      sawFlop++;
      
      const heroSawShowdown = heroActions.some(a => a.street === 'river');
      const heroDidntFold = !heroActions.some(a => a.action === 'fold');
      
      if (heroSawShowdown && heroDidntFold) {
        wentToShowdown++;
      }
    }

    // W$SD: Did hero win at showdown?
    if (wentToShowdown > 0) {
      wsdOpportunities++;
      
      if (hand.result === 'win') {
        wonAtShowdown++;
      }
    }

    // Aggression: Count aggressive vs passive actions
    for (const action of heroActions) {
      if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
        aggressiveActions++;
      } else if (action.action === 'call' || action.action === 'check') {
        passiveActions++;
      }
      // Note: folds don't count toward aggression factor
    }
  }

  const handsAnalyzed = hands.length;
  const aggressionFactor = passiveActions > 0 ? aggressiveActions / passiveActions : aggressiveActions;
  const totalActions = aggressiveActions + passiveActions;
  const aggressionFreq = totalActions > 0 ? aggressiveActions / totalActions : 0;

  return {
    handsAnalyzed,
    
    vpip: handsAnalyzed > 0 ? vpipHands / handsAnalyzed : 0,
    pfr: handsAnalyzed > 0 ? pfrHands / handsAnalyzed : 0,
    threeBet: threeBetOpportunities > 0 ? threeBets / threeBetOpportunities : 0,
    threeBetOpportunities,
    foldTo3Bet: foldTo3BetOpportunities > 0 ? foldTo3Bets / foldTo3BetOpportunities : 0,
    foldTo3BetOpportunities,
    
    cbet: cbetOpportunities > 0 ? cbets / cbetOpportunities : 0,
    cbetOpportunities,
    foldToCbet: foldToCbetOpportunities > 0 ? foldToCbets / foldToCbetOpportunities : 0,
    foldToCbetOpportunities,
    
    wtsd: sawFlop > 0 ? wentToShowdown / sawFlop : 0,
    wentToShowdownCount: wentToShowdown,
    sawFlopCount: sawFlop,
    wsd: wsdOpportunities > 0 ? wonAtShowdown / wsdOpportunities : 0,
    wonAtShowdownCount: wonAtShowdown,
    wsdOpportunities,
    
    aggressionFactor,
    aggressionFreq,
    totalAggressiveActions: aggressiveActions,
    totalPassiveActions: passiveActions,
    
    totalProfit,
    bbPer100Hands: handsAnalyzed > 0 ? (totalProfit / handsAnalyzed) * 100 / bigBlind : 0,
    winRate: handsAnalyzed > 0 ? hands.filter(h => h.result === 'win').length / handsAnalyzed : 0,
  };
}

/**
 * Find the first raise in actions that wasn't made by hero
 */
function findFirstRaiseNotByHero(actions: GameAction[]): GameAction | null {
  return actions.find(a =>
    a.playerId !== HERO_PLAYER_ID &&
    (a.action === 'raise' || a.action === 'bet')
  ) ?? null;
}

/**
 * Create empty stats object
 */
function createEmptyStats(): HeroStats {
  return {
    handsAnalyzed: 0,
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    threeBetOpportunities: 0,
    foldTo3Bet: 0,
    foldTo3BetOpportunities: 0,
    cbet: 0,
    cbetOpportunities: 0,
    foldToCbet: 0,
    foldToCbetOpportunities: 0,
    wtsd: 0,
    wentToShowdownCount: 0,
    sawFlopCount: 0,
    wsd: 0,
    wonAtShowdownCount: 0,
    wsdOpportunities: 0,
    aggressionFactor: 0,
    aggressionFreq: 0,
    totalAggressiveActions: 0,
    totalPassiveActions: 0,
    totalProfit: 0,
    bbPer100Hands: 0,
    winRate: 0,
  };
}
