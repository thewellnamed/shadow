import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';

/**
 * Summarize performance for a single spell over an encounter
 */
export class SpellSummary {
  spellId: SpellId;
  spellData: ISpellData;
  casts: CastDetails[] = []

  private _successfulCasts: number;
  private _totalDamage = 0;
  private _totalHits = 0;
  private _avgDamage = 0;
  private _avgHit = 0;
  private _avgHitsPerCast = 0;
  private _channelStats: IChannelStats;
  private _downtimeStats: IDowntimeStats;
  private _hitStats: IStatsMap;
  private _targetStats: IStatsMap;

  private recalculate = false;

  constructor(spellId: SpellId) {
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
  }

  addCast(details: CastDetails) {
    this.casts.push(details);
    this.recalculate = true;
  }

  get castCount() {
    return this.casts.length;
  }

  get successfulCasts() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._successfulCasts;
  }

  get totalDamage() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalDamage;
  }

  get totalHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalHits;
  }

  get avgHitCount() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgHitsPerCast;
  }

  get avgDamage() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgDamage;
  }

  get avgHit() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgHit;
  }

  get channelStats() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._channelStats;
  }

  get downtimeStats() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._downtimeStats;
  }

  get statsByHitCount() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._hitStats;
  }

  get statsByTarget() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._targetStats;
  }

  hitStats(hitCount: number) {
    if (this.recalculate) {
      this.calculate();
    }

    return this._hitStats[hitCount];
  }

  targetStats(targetId: number): IHitStats {
    if (this.recalculate) {
      this.calculate();
    }

    return this._targetStats[targetId];
  }

  /**
   * Recalculate aggregate statistics
   * @private
   */
  private calculate() {
    // aggregates only for damage spells
    if (this.spellData.damageType === DamageType.NONE) {
      return;
    }

    this.calculateDamageStats();
    this.calculateChannelStats();
    this.calculateDowntimeStats();
    this.calculateStatsByHitCount();
    this.calculateStatsByTarget();

    this.recalculate = false;
  }

  /**
   * Total Damage stats
   * @private
   */
  private calculateDamageStats() {
    // unresisted casts
    this._successfulCasts = this.casts.filter((c) => c.totalDamage > 0).length;

    // total damage across all casts
    this._totalDamage = this.casts.reduce((sum, next) => {
      sum += next.totalDamage;
      return sum;
    }, 0);

    this._avgDamage = this._totalDamage / this.casts.length;

    // total damage instances (ticks)
    this._totalHits = this.casts
      .filter((c) => c.totalDamage > 0)
      .reduce((sum, next) => {
        sum += (this.spellData.maxDamageInstances > 1 ? next.ticks : 1);
        return sum;
      }, 0);

    this._avgHitsPerCast = this._totalHits / this._successfulCasts;
    this._avgHit = this._totalDamage / this._totalHits;
  }

  private calculateChannelStats() {
    if (this.spellData.damageType !== DamageType.CHANNEL) {
      return;
    }

    this._channelStats = this.casts
      .reduce((stats, cast) => {
        stats.totalNextCastLatency += cast.nextCastLatency;
        return stats;
      }, this.createChannelStats());

    this._channelStats.avgNextCastLatency = this._channelStats.totalNextCastLatency / this._successfulCasts;
  }

  private calculateDowntimeStats() {
    if (this.evaluateDowntime) {
      this._downtimeStats = this.casts
        .reduce((stats, cast) => {
          stats.totalDowntime += this.getDowntime(cast);
          if (cast.clippedPreviousCast) {
            stats.clipCount++;
            stats.clippedTicks += cast.clippedTicks;
          }
          return stats;
        }, this.createDowntimeStats());

      this._downtimeStats.avgDowntime = this._downtimeStats.totalDowntime / this._successfulCasts;
      this._downtimeStats.missedTickPercent =
        this._downtimeStats.clippedTicks / (this._successfulCasts * this.spellData.maxDamageInstances);
    }
  }

  private calculateStatsByHitCount() {
    if (this.spellData.maxDamageInstances < 2) {
      return;
    }

    this._hitStats = this.casts.reduce(
      (statsMap, next) => this.addStatsToMap(statsMap, next.ticks, next),
      {} as IStatsMap
    );
    this.setAverages(this._hitStats);
  }

  private calculateStatsByTarget() {
    this._targetStats = this.casts.reduce(
      (statsMap, next) => this.addStatsToMap(statsMap, next.targetId, next),
      {} as IStatsMap
    );

    this.setAverages(this._targetStats);
  }

  private addStatsToMap(statsMap: IStatsMap, key: number, cast: CastDetails) {
    if (statsMap.hasOwnProperty(key)) {
      statsMap[key].castCount++;

      if (cast.totalDamage > 0) {
        statsMap[key].successCount++;
      }

      if (this.spellData.damageType === DamageType.CHANNEL) {
        statsMap[key].channelStats.totalNextCastLatency += cast.nextCastLatency;
      }

      if (this.evaluateDowntime) {
        statsMap[key].downtimeStats.totalDowntime += this.getDowntime(cast);

        if (cast.clippedPreviousCast) {
          statsMap[key].downtimeStats.clippedTicks += cast.clippedTicks;
          statsMap[key].downtimeStats.clipCount++;
        }
      }
    } else {
      statsMap[key] = {
        castCount: 1,
        successCount: cast.totalDamage > 0 ? 1 : 0,
        channelStats: this.createChannelStats(cast),
        downtimeStats: this.createDowntimeStats(cast)
      };
    }

    return statsMap;
  }

  private setAverages(statsMap: IStatsMap) {
    for (const key in statsMap) {
      const stats = statsMap[key];

      if (this.spellData.damageType === DamageType.CHANNEL) {
        stats.channelStats.avgNextCastLatency = stats.channelStats.totalNextCastLatency / stats.successCount;
      }

      if (this.evaluateDowntime) {
        stats.downtimeStats.avgDowntime = stats.downtimeStats.totalDowntime / stats.successCount;

        // what percentage of the total ticks I should have gotten were missed
        stats.downtimeStats.missedTickPercent =
          stats.downtimeStats.clippedTicks / (stats.successCount * this.spellData.maxDamageInstances);
      }
    }
  }

  private getDowntime(cast: CastDetails) {
    return this.spellData.damageType === DamageType.DOT ? cast.dotDowntime : cast.timeOffCooldown;
  }

  private createChannelStats(cast?: CastDetails): IChannelStats {
    return {
      totalNextCastLatency: cast?.nextCastLatency || 0,
      avgNextCastLatency: 0
    };
  }

  private createDowntimeStats(cast?: CastDetails): IDowntimeStats {
    return {
      clipCount: cast?.clippedPreviousCast ? 1 : 0,
      clippedTicks: cast?.clippedTicks || 0,
      missedTickPercent: 0,
      totalDowntime: cast ? this.getDowntime(cast) : 0,
      avgDowntime: 0
    };
  }

  private get evaluateDowntime() {
    return  (this.spellData.cooldown > 0 || this.spellData.damageType === DamageType.DOT);
  }
}

export interface IStatsMap {
  [key: number]: IHitStats;
}

export interface IHitStats {
  castCount: number;
  successCount: number;
  channelStats: IChannelStats;
  downtimeStats: IDowntimeStats;
}

export interface IChannelStats {
  totalNextCastLatency: number;
  avgNextCastLatency: number;
}

export interface IDowntimeStats {
  clipCount: number;
  clippedTicks: number;
  missedTickPercent: number;
  totalDowntime: number;
  avgDowntime: number;
}


