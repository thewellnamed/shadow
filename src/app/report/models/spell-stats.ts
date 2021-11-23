import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';

export class SpellStats {
  casts: CastDetails[] = [];
  targetId: number;

  castCount = 0;
  successCount = 0;
  minTimestamp = 0;
  maxTimestamp = 0;
  activeDuration = 1;
  totalDamage = 0;
  totalHits = 0;
  totalWeightedSpellpower = 0;

  recalculate = true;

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
  private _downtimeStats: IDowntimeStats = {
    castCount: 0,
    clipCount: 0,
    clippedTicks: 0,
    missedTickPercent: 0,
    expectedTicks: 0,
    totalDowntime: 0,
    avgDowntime: 0
  };

  constructor(targetId = 0, casts?: CastDetails[]) {
    this.targetId = targetId;
    if (casts) {
      this.addCasts(casts);
    }
  }

  get targetIds() {
    return [... this._targetIds];
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

  get hasDowntimeStats() {
    return this._downtimeStats.castCount > 0;
  }

  get downtimeStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._downtimeStats;
  }

  get channelStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._channelStats;
  }

  targetStats(targetId: number): SpellStats {
    const stats = this._targetStats[targetId];

    if (stats && stats.recalculate) {
      stats.updateStats();
    }

    return stats;
  }

  addCast(cast: CastDetails) {
    this.casts.push(cast);
    this.castCount++;

    const spellData = SpellData[cast.spellId];
    if (spellData.damageType === DamageType.NONE) {
      return;
    }

    if (cast.totalDamage > 0) {
      this.successCount++;
      this.totalDamage += cast.totalDamage;
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

    if (this.addDowntimeStats(cast)) {
      this._downtimeStats.castCount++;
      this._downtimeStats.expectedTicks += spellData.maxDamageInstances;
      this._downtimeStats.totalDowntime += spellData.damageType === DamageType.DOT ?
        cast.dotDowntime :
        cast.timeOffCooldown;

      if (cast.clippedPreviousCast) {
        this._downtimeStats.clipCount++;
        this._downtimeStats.clippedTicks += cast.clippedTicks;
      }
    }

    if (this.addChannelStats(cast)) {
      this._channelStats.castCount++;
      this._channelStats.totalNextCastLatency += cast.nextCastLatency;
    }

    if (this.targetId === 0) {
      this._targetIds.add(cast.targetId);
      if (!this._targetStats.hasOwnProperty(cast.targetId)) {
        this._targetStats[cast.targetId] = new SpellStats(cast.targetId);
      }
      this._targetStats[cast.targetId].addCast(cast);
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

      // todo: merge downtime/channel stats
    }

    this.recalculate = true;
  }

  updateStats() {
    this._avgDamage = this.totalDamage / this.castCount;
    this._avgHit = this.totalDamage / this.totalHits;
    this._avgHitCount = this.totalHits / this.successCount;
    this._avgSpellpower = this.totalWeightedSpellpower / this.totalDamage;

    if (this.hasChannelStats) {
      this._channelStats!.avgNextCastLatency = this._channelStats!.totalNextCastLatency / this.successCount;
    }

    if (this.hasDowntimeStats) {
      this._downtimeStats!.avgDowntime = this._downtimeStats!.totalDowntime / this.successCount;

      // what percentage of the total ticks I should have gotten were missed
      this._downtimeStats!.missedTickPercent = this._downtimeStats!.clippedTicks / this._downtimeStats!.expectedTicks;
    }

    this.recalculate = false;
  }

  private addDowntimeStats(cast: CastDetails) {
    const spellData = SpellData[cast.spellId];
    return (spellData.cooldown > 0 || spellData.damageType === DamageType.DOT);
  }

  private addChannelStats(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.CHANNEL;
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

export interface IDowntimeStats {
  castCount: number;
  clipCount: number;
  clippedTicks: number;
  expectedTicks: number;
  missedTickPercent: number;
  totalDowntime: number;
  avgDowntime: number;
}

