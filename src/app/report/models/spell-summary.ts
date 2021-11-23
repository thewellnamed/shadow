import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';

/**
 * Summarize performance for a single spell over an encounter
 */
export class SpellSummary implements IHitStats {
  spellId: SpellId;
  spellData: ISpellData;
  casts: CastDetails[] = [];
  recalculate = true;

  private _targets: number[];
  private _successCount = 0;
  private _totalDamage = 0;
  private _totalHits = 0;
  private _totalWeightedSpellpower = 0;
  private _avgDamage = 0;
  private _avgHit = 0;
  private _avgHitsPerCast = 0;
  private _avgSpellpower = 0;
  private _minTimestamp = 0;
  private _maxTimestamp = 0;
  private _channelStats: IChannelStats;
  private _downtimeStats: IDowntimeStats;
  private _hitStats: IStatsMap = {};
  private _targetStats: IStatsMap = {};

  constructor(spellId: SpellId) {
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
    this._channelStats = this.createChannelStats();
    this._downtimeStats = this.createDowntimeStats();
  }

  addCast(details: CastDetails) {
    this.casts.push(details);
    this.recalculate = true;
  }

  get hasDowntimeStats() {
    return (this.spellData.cooldown > 0 || this.spellData.damageType === DamageType.DOT);
  }

  get hasChannelStats() {
    return this.spellData.damageType === DamageType.CHANNEL;
  }

  get targets() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._targets;
  }

  get minTimestamp() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._minTimestamp;
  }

  get maxTimestamp() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._maxTimestamp;
  }

  get castCount() {
    return this.casts.length;
  }

  get successCount() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._successCount;
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

  get totalWeightedSpellpower() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalWeightedSpellpower;
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

  get avgSpellpower() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgSpellpower;
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
    if (this.spellData.damageType === DamageType.NONE || this.casts.length === 0) {
      return;
    }

    this._targets = [... new Set(this.casts.map((c) => c.targetId))];

    this.calculateDamageStats();
    this.calculateChannelStats();
    this.calculateDowntimeStats();
    this.calculateStatsByHitCount();
    this.calculateStatsByTarget();

    this.recalculate = false;
  }

  /**
   * Total Damage stats
   * TODO - could do all of this in one loop. Less functional, faster
   * @private
   */
  private calculateDamageStats() {
    // unresisted casts
    this._successCount = this.casts.filter((c) => c.totalDamage > 0).length;

    // total damage across all casts
    // also timestamps
    this._totalDamage = this.casts.reduce((sum, next) => {
      sum += next.totalDamage;

      if (next.instances.length > 0) {
        const lastInstance = next.instances[next.instances.length - 1];

        if (this._minTimestamp === 0 || next.castStart < this._minTimestamp) {
          this._minTimestamp = next.castStart;
        }

        if (this._maxTimestamp === 0 || lastInstance.timestamp > this._maxTimestamp) {
          this._maxTimestamp = lastInstance.timestamp;
        }
      }

      return sum;
    }, 0);

    this._avgDamage = this._totalDamage / this.casts.length;

    // total damage instances (ticks)
    this._totalHits = this.casts
      .filter((c) => c.totalDamage > 0)
      .reduce((sum, next) => {
        sum += this.evaluateHits(next);
        return sum;
      }, 0);

    this._avgHitsPerCast = this._totalHits / this._successCount;
    this._avgHit = this._totalDamage / this._totalHits;

    // Spellpower
    this._totalWeightedSpellpower = this.casts.reduce((sum, next) => {
      sum += next.spellPower * next.totalDamage;
      return sum;
    }, 0);
    this._avgSpellpower = this._totalWeightedSpellpower / this._totalDamage;
  }

  private calculateChannelStats() {
    if (!this.hasChannelStats) {
      return;
    }

    this._channelStats = this.casts
      .reduce((stats, cast) => {
        stats.totalNextCastLatency += cast.nextCastLatency;
        return stats;
      }, this.createChannelStats());

    this._channelStats.avgNextCastLatency = this._channelStats.totalNextCastLatency / this._successCount;
  }

  private calculateDowntimeStats() {
    if (!this.hasDowntimeStats) {
      return;
    }

    this._downtimeStats = this.casts
      .reduce((stats, cast) => {
        stats.totalDowntime += this.getDowntime(cast);
        if (cast.clippedPreviousCast) {
          stats.clipCount++;
          stats.clippedTicks += cast.clippedTicks;
        }
        return stats;
      }, this.createDowntimeStats());

    this._downtimeStats.avgDowntime = this._downtimeStats.totalDowntime / this._successCount;
    this._downtimeStats.missedTickPercent =
      this._downtimeStats.clippedTicks / (this._successCount * this.spellData.maxDamageInstances);
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
      statsMap[key].totalDamage += cast.totalDamage;

      if (cast.instances.length > 0) {
        const lastInstance = cast.instances[cast.instances.length - 1];

        if (statsMap[key].minTimestamp === 0 || cast.castStart < statsMap[key].minTimestamp) {
          statsMap[key].minTimestamp = cast.castStart;
        }

        if (statsMap[key].maxTimestamp === 0 || lastInstance.timestamp > statsMap[key].maxTimestamp) {
          statsMap[key].maxTimestamp = lastInstance.timestamp;
        }
      }

      const hits = this.evaluateHits(cast);
      statsMap[key].totalHits += hits;
      statsMap[key].totalWeightedSpellpower += (cast.spellPower * cast.totalDamage);

      if (cast.totalDamage > 0) {
        statsMap[key].successCount++;
      }

      if (this.hasChannelStats) {
        statsMap[key].channelStats!.totalNextCastLatency += cast.nextCastLatency;
      }

      if (this.hasDowntimeStats) {
        statsMap[key].downtimeStats!.totalDowntime += this.getDowntime(cast);

        if (cast.clippedPreviousCast) {
          statsMap[key].downtimeStats!.clippedTicks += cast.clippedTicks;
          statsMap[key].downtimeStats!.clipCount++;
        }
      }
    } else {
      const hits = this.evaluateHits(cast);

      statsMap[key] = {
        spellId: this.spellId,
        castCount: 1,
        minTimestamp: cast.castStart,
        maxTimestamp: cast.instances.length === 0 ? cast.castEnd : cast.instances[cast.instances.length - 1].timestamp,
        successCount: cast.totalDamage > 0 ? 1 : 0,
        totalDamage: cast.totalDamage,
        totalHits: hits,
        totalWeightedSpellpower: cast.spellPower * cast.totalDamage,
        avgDamage: 0,
        avgHit: 0,
        avgHitCount: 0,
        avgSpellpower: 0,
        hasChannelStats: this.hasChannelStats,
        channelStats: this.createChannelStats(cast),
        hasDowntimeStats: this.hasDowntimeStats,
        downtimeStats: this.createDowntimeStats(cast)
      };
    }

    return statsMap;
  }

  private setAverages(statsMap: IStatsMap) {
    for (const key in statsMap) {
      const stats = statsMap[key];

      stats.avgDamage = stats.totalDamage / stats.castCount;
      stats.avgHit = stats.totalDamage / stats.totalHits;
      stats.avgHitCount = stats.totalHits / stats.successCount;
      stats.avgSpellpower = stats.totalWeightedSpellpower / stats.totalDamage;

      if (this.hasChannelStats) {
        stats.channelStats!.avgNextCastLatency = stats.channelStats!.totalNextCastLatency / stats.successCount;
      }

      if (this.hasDowntimeStats) {
        stats.downtimeStats!.avgDowntime = stats.downtimeStats!.totalDowntime / stats.successCount;

        // what percentage of the total ticks I should have gotten were missed
        stats.downtimeStats!.missedTickPercent =
          stats.downtimeStats!.clippedTicks / (stats.successCount * this.spellData.maxDamageInstances);
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

  private evaluateHits(cast: CastDetails) {
    if (this.spellData.maxDamageInstances > 1) {
      return cast.ticks;
    }

    if (cast.totalDamage > 0) {
      return 1;
    }

    return 0;
  }
}

export interface IStatsMap {
  [key: number]: IHitStats;
}

export interface IHitStats {
  spellId: number;
  castCount: number;
  successCount: number;
  minTimestamp: number;
  maxTimestamp: number;
  totalDamage: number;
  totalHits: number;
  avgHitCount: number;
  avgDamage: number;
  avgHit: number;
  totalWeightedSpellpower: number;
  avgSpellpower: number;
  hasChannelStats: boolean;
  channelStats?: IChannelStats;
  hasDowntimeStats: boolean;
  downtimeStats?: IDowntimeStats;
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


