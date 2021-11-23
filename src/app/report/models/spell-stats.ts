import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';

export class SpellStats {
  castCount = 0;
  successCount = 0;
  minTimestamp = 0;
  maxTimestamp = 0;
  activeDuration = 1;
  totalDamage = 0;
  totalHits = 0;
  totalWeightedSpellpower = 0;

  recalculate = true;

  private _casts: CastDetails[] = [];
  private _sortedCasts?: CastDetails[];
  private _includeTargetStats = false;
  private _targetIds: Set<number> = new Set();
  private _avgDamage = 0;
  private _avgHitCount = 0;
  private _avgHit = 0;
  private _avgSpellpower = 0;
  private _targetStats: IStatsMap = {};
  private _channelStats: IChannelStats = {
    castCount: 0,
    totalNextCastLatency: 0,
    avgNextCastLatency: 0
  };
  private _dotStats: IDotStats = {
    castCount: 0,
    clipCount: 0,
    clippedTicks: 0,
    missedTickPercent: 0,
    expectedTicks: 0,
    totalDowntime: 0,
    avgDowntime: 0
  };
  private _cooldownStats: ICooldownStats = {
    castCount: 0,
    totalOffCooldown: 0,
    avgOffCooldown: 0
  };

  constructor(casts?: CastDetails[], includeTargetStats = false) {
    this._includeTargetStats = includeTargetStats;

    if (casts) {
      this.addCasts(casts);
    }
  }

  get targetIds() {
    return [... this._targetIds];
  }

  get casts() {
    if (!this._sortedCasts) {
      this._sortedCasts = this._casts.sort((a, b) => a.castStart - b.castStart);
    }

    return this._sortedCasts;
  }

  get avgDamage() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._avgDamage;
  }

  get avgHitCount() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._avgHitCount;
  }

  get avgHit() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._avgHit;
  }

  get avgSpellpower() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._avgSpellpower;
  }

  get hasChannelStats() {
    return this._channelStats.castCount > 0;
  }

  get hasCooldownStats() {
    return this._cooldownStats.castCount > 0;
  }

  get hasDotStats() {
    return this._dotStats.castCount > 0;
  }

  get channelStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._channelStats;
  }

  get cooldownStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._cooldownStats;
  }

  get dotStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._dotStats;
  }

  targetStats(targetId: number): SpellStats {
    const stats = this._targetStats[targetId];

    if (stats?.recalculate) {
      stats.updateStats();
    }

    return stats;
  }

  addCast(cast: CastDetails) {
    this._casts.push(cast);
    this._sortedCasts = undefined;
    this.castCount++;
    this.recalculate = true;

    this._targetIds.add(cast.targetId);
    if (this._includeTargetStats) {
      if (!this._targetStats.hasOwnProperty(cast.targetId)) {
        this._targetStats[cast.targetId] = new SpellStats();
      }
      this._targetStats[cast.targetId].addCast(cast);
    }

    const spellData = SpellData[cast.spellId];
    if (spellData.damageType === DamageType.NONE) {
      return;
    }

    if (cast.totalDamage > 0) {
      this.successCount++;
      this.totalDamage += cast.totalDamage + cast.totalAbsorbed;
      this.totalHits += this.evaluateHits(cast);
      this.totalWeightedSpellpower += (cast.spellPower * cast.totalDamage);
    }

    if (cast.instances.length > 0) {
      const lastInstance = cast.instances[cast.instances.length - 1];

      if (this.minTimestamp === 0 || cast.castStart < this.minTimestamp) {
        this.minTimestamp = cast.castStart;
      }

      if (this.maxTimestamp === 0 || lastInstance.timestamp > this.maxTimestamp) {
        this.maxTimestamp = lastInstance.timestamp;
      }
    }

    if (this.addChannelStats(cast)) {
      this._channelStats.castCount++;
      this._channelStats.totalNextCastLatency += cast.nextCastLatency;
    }

    if (this.addCooldownStats(cast)) {
      this._cooldownStats.castCount++;
      this._cooldownStats.totalOffCooldown += cast.timeOffCooldown;
    }

    if (this.addDotStats(cast)) {
      this._dotStats.castCount++;
      this._dotStats.expectedTicks += spellData.maxDamageInstances;
      this._dotStats.totalDowntime += cast.dotDowntime;

      if (cast.clippedPreviousCast) {
        this._dotStats.clipCount++;
        this._dotStats.clippedTicks += cast.clippedTicks;
      }
    }

    this.recalculate = true;
  }

  addCasts(casts: CastDetails[]) {
    for (const next of casts) {
      this.addCast(next);
    }
  }

  merge(stats: SpellStats|SpellStats[]) {
    if (!Array.isArray(stats)) {
      stats = [stats];
    }

    for (const next of stats) {
      this._casts = this._casts.concat(next.casts);
      this.castCount += next.castCount;

      this.successCount += next.successCount;
      this.totalDamage += next.totalDamage;
      this.totalHits += next.totalHits;
      this.totalWeightedSpellpower += next.totalWeightedSpellpower;
      this.activeDuration += next.activeDuration;

      if (this.minTimestamp === 0 || next.minTimestamp < this.minTimestamp) {
        this.minTimestamp = next.minTimestamp;
      }

      if (this.maxTimestamp === 0 || next.maxTimestamp > this.maxTimestamp) {
        this.maxTimestamp = next.maxTimestamp;
      }

      if (next.hasChannelStats) {
        this._channelStats.castCount += next.channelStats.castCount;
        this._channelStats.totalNextCastLatency += next.channelStats.totalNextCastLatency;
      }

      if (next.hasCooldownStats) {
        this._cooldownStats.castCount += next.cooldownStats.castCount;
        this._cooldownStats.totalOffCooldown += next._cooldownStats.totalOffCooldown;
      }

      if (next.hasDotStats) {
        this._dotStats.castCount += next.dotStats.castCount;
        this._dotStats.clipCount += next.dotStats.clipCount;
        this._dotStats.clippedTicks += next.dotStats.clippedTicks;
        this._dotStats.expectedTicks += next.dotStats.expectedTicks;
        this._dotStats.totalDowntime += next.dotStats.totalDowntime;
      }

      if (this._includeTargetStats) {
        for (const targetId of next.targetIds) {
          const targetStats = next.targetStats(targetId);

          this._targetIds.add(targetId);
          if (this._targetStats.hasOwnProperty(targetId)) {
            this._targetStats[targetId].merge(targetStats);
          } else {
            this._targetStats[targetId] = new SpellStats(targetStats.casts);
          }
        }
      }
    }

    this._sortedCasts = undefined;
    this.recalculate = true;
  }

  updateStats() {
    this._avgDamage = this.totalDamage / this.castCount;
    this._avgHit = this.totalDamage / this.totalHits;
    this._avgHitCount = this.totalHits / this.successCount;
    this._avgSpellpower = this.totalWeightedSpellpower / this.totalDamage;

    if (this.hasChannelStats) {
      this._channelStats.avgNextCastLatency = this._channelStats.totalNextCastLatency / this.successCount;
    }

    if (this.hasCooldownStats) {
      this._cooldownStats.avgOffCooldown = this._cooldownStats.totalOffCooldown / this._cooldownStats.castCount;
    }

    if (this.hasDotStats) {
      this._dotStats.avgDowntime = this._dotStats.totalDowntime / this._dotStats.castCount;

      // what percentage of the total ticks I should have gotten were missed
      if (this._dotStats.expectedTicks > 0) {
        this._dotStats.missedTickPercent = this._dotStats.clippedTicks / this._dotStats.expectedTicks;
      }
    }

    this.recalculate = false;
  }

  private addChannelStats(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.CHANNEL;
  }

  private addCooldownStats(cast: CastDetails) {
    return SpellData[cast.spellId].cooldown > 0;
  }

  private addDotStats(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.DOT;
  }

  private evaluateHits(cast: CastDetails) {
    if (cast.instances.length > 1) {
      return cast.instances.length;
    }

    if (cast.totalDamage > 0) {
      return 1;
    }

    return 0;
  }

  private getActiveDuration(cast: CastDetails) {
    const end = cast.instances.length > 0 ? cast.instances[cast.instances.length - 1].timestamp : cast.castEnd;
    return (end - cast.castStart)/1000;
  }
}

export interface IStatsMap {
  [key: number]: SpellStats;
}

export interface IChannelStats {
  castCount: number;
  totalNextCastLatency: number;
  avgNextCastLatency: number;
}

export interface ICooldownStats {
  castCount: number;
  totalOffCooldown: number;
  avgOffCooldown: number;
}

export interface IDotStats {
  castCount: number;
  clipCount: number;
  clippedTicks: number;
  expectedTicks: number;
  missedTickPercent: number;
  totalDowntime: number;
  avgDowntime: number;
}
