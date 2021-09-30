import { CastDetails } from 'src/app/report/models/cast-details';
import { ISpellData, SpellData, SpellId } from 'src/app/logs/models/spell-id.enum';

/**
 * Summarize performance for a single spell over an encounter
 */
export class SpellSummary {
  spellId: SpellId;
  spellData: ISpellData;
  casts: CastDetails[] = []

  private _totalDamage = 0;
  private _totalHits = 0;
  private _successfulCasts: number;
  private _castsByHitCount: IHitStats;
  private recalculate = false;

  private _avgHits = 0;
  private _avgDotDowntime: IAvgDotDowntimeMap = {};
  private _avgTimeOffCooldown = 0;

  constructor(spellId: SpellId) {
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
  }

  addCast(details: CastDetails) {
    this.casts.push(details);
    this.recalculate = true;
  }

  get count() {
    return this.casts.length;
  }

  get totalDamage() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalDamage;
  }

  get successfulCasts() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._successfulCasts;
  }

  get totalHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalHits;
  }

  get castsByHitCount() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._castsByHitCount;
  }

  get avgHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgHits;
  }

  avgDotDowntime(targetId?: number | 'all'): IAvgDotDowntime | IAvgDotDowntimeMap {
    if (this.recalculate) {
      this.calculate();
    }

    if (targetId === 'all') {
      let count = 0, downtime = 0;
      for (const targetId in this._avgDotDowntime) {
        const dt = this._avgDotDowntime[targetId];
        count += dt.count;
        downtime += dt.total;
      }

      return { count, total: downtime, avg: downtime / count };
    } else if (targetId) {
      return this._avgDotDowntime[targetId];
    }

    return Object.assign(this._avgDotDowntime, { 0: this.avgDotDowntime('all') }) as IAvgDotDowntimeMap;
  }

  get avgTimeOffCooldown() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgTimeOffCooldown;
  }

  /**
   * Recalculate aggregate statistics
   * @private
   */
  private calculate() {
    // aggregates only for damage spells
    if (!this.spellData.damage) {
      return;
    }

    this.calculateTotalDamageStats();
    this.calculateHitStats();
    this.calculateDotStats();
    this.calculateCooldownStats();

    this.recalculate = false;
  }

  /**
   * Total Damage stats
   * @private
   */
  private calculateTotalDamageStats() {
    // total damage across all casts
    this._totalDamage = this.casts.reduce((sum, next) => {
      sum += next.totalDamage;
      return sum;
    }, 0);

    // unresisted casts
    this._successfulCasts = this.casts.filter((c) => c.totalDamage > 0).length;

    // total damage instances (ticks)
    this._totalHits = this.casts
      .filter((c) => c.totalDamage > 0)
      .reduce((sum, next) => {
        sum += (this.spellData.maxDamageInstances > 1 ? next.ticks : 1);
        return sum;
      }, 0);
  }

  /**
   * Aggregate hit stats (e.g. MF ticks or DoT hits)
   * @private
   */
  private calculateHitStats() {
    if (this.spellData.maxDamageInstances > 1) {
      this._avgHits = this._totalHits / this._successfulCasts;

      this._castsByHitCount = this.casts
        .filter((c) => c.totalDamage > 0)
        .reduce((stats, next) => {
          if (stats.hasOwnProperty(next.ticks)) {
            stats[next.ticks].count++;
            stats[next.ticks].totalLatency += next.clipLatency;
          } else {
            stats[next.ticks] = { count: 1, totalLatency: 0 };
          }
          return stats;
        }, {} as IHitStats);

      // update clip latency stats
      if (this.spellId === SpellId.MIND_FLAY) {
        for (const tickCount in this._castsByHitCount) {
          const stats = this._castsByHitCount[tickCount];
          stats.avgLatency = stats.totalLatency! / stats.count;
        }
      }
    } else {
      this._avgHits = 1;
      this._castsByHitCount = { [1]: { count: this._successfulCasts, totalLatency: 0, avgLatency: 0 }};
    }
  }

  /**
   * Calculate DoT downtime
   * @private
   */
  private calculateDotStats() {
    if (this.spellData.maxDuration > 0) {
      this._avgDotDowntime = this.casts.reduce((dt, cast) => {
        if (dt.hasOwnProperty(cast.targetId)) {
          dt[cast.targetId].count++;
          dt[cast.targetId].total += cast.dotDowntime;
        } else {
          dt[cast.targetId] = {
            count: 1,
            total: cast.dotDowntime,
            avg: 0
          }
        }
        return dt;
      }, {} as IAvgDotDowntimeMap);

      for (const targetId in this._avgDotDowntime) {
        const dt = this._avgDotDowntime[targetId];
        dt.avg = dt.total / dt.count;
      }
    }
  }

  private calculateCooldownStats() {
    if (this.spellData.cooldown > 0 && this.casts.length > 0) {
      const total = this.casts.reduce((sum, c) => {
        sum += c.timeOffCooldown;
        return sum;
      }, 0);

      this._avgTimeOffCooldown = total / this.casts.length;
    }
  }
}

export interface IAvgDotDowntimeMap {
  [targetId: number]: IAvgDotDowntime;
}

export interface IAvgDotDowntime {
  avg: number;
  total: number;
  count: number;
}

export interface IHitStats {
  [hits: number]: { count: number; totalLatency: number; avgLatency?: number };
}
