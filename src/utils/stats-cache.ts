import type { StoredHand } from '../storage/hand-history';
import type { HeroStats } from '../stats/types';

/**
 * Simple in-memory cache for hero stats to avoid recalculating on every render
 */
class StatsCache {
  private cache: Map<string, { stats: HeroStats; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key based on hands array
   */
  private getCacheKey(hands: StoredHand[]): string {
    if (hands.length === 0) return 'empty';
    
    // Use last hand ID + total count as cache key
    const lastHand = hands[hands.length - 1];
    return `${lastHand.handId}-${hands.length}`;
  }

  /**
   * Get cached stats if available and not expired
   */
  get(hands: StoredHand[]): HeroStats | null {
    const key = this.getCacheKey(hands);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.stats;
  }

  /**
   * Store stats in cache
   */
  set(hands: StoredHand[], stats: HeroStats): void {
    const key = this.getCacheKey(hands);
    this.cache.set(key, { stats, timestamp: Date.now() });
    
    // Clean up old entries if cache gets too large
    if (this.cache.size > 20) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 5 entries
      for (let i = 0; i < 5; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear all cached stats
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const statsCache = new StatsCache();
