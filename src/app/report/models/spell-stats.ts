import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';

export class SpellStats {
  castCount = 0;
  successCount = 0;
  minTimestamp = 0;
  maxTimestamp = 0;
  totalDamage = 0;
  totalHits = 0;
  totalWeightedSpellpower = 0;

  recalculate = true;

  private _casts: CastDetails[] = [];
  private _sortedCasts?: CastDetails[];
  private _activeDuration = 0;
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

  private _cooldownStats: ICooldownStats = {
    castCount: 0,
    totalOffCooldown: 0,
    avgOffCooldown: 0
  };

  private _clipStats: IDotClipStats = {
    castCount: 0,
    clipCount: 0,
    clippedTicks: 0,
    missedTickPercent: 0,
    expectedTicks: 0,
  };

  private _dotDowntimeStats: IDotDownTimeStats = {
    castCount: 0,
    totalDowntime: 0,
    avgDowntime: 0
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

  get activeDuration() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._activeDuration;
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

  get hasClipStats() {
    return this._clipStats.castCount > 0;
  }

  get hasDotDowntimeStats() {
    return this._dotDowntimeStats.castCount > 0;
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

  get clipStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._clipStats;
  }

  get dotDowntimeStats() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._dotDowntimeStats;
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

    if (this.addChannelStats(cast)) {
      this._channelStats.castCount++;
      this._channelStats.totalNextCastLatency += cast.nextCastLatency as number;
    }

    if (this.addCooldownStats(cast)) {
      this._cooldownStats.castCount++;
      this._cooldownStats.totalOffCooldown += cast.timeOffCooldown as number;
    }

    if (this.addClipStats(cast)) {
      this._clipStats.castCount++;

      if (!cast.failed) {
        this._clipStats.expectedTicks += cast.truncated ? cast.instances.length : spellData.maxDamageInstances;
      }

      if (cast.clippedPreviousCast) {
        this._clipStats.clipCount++;
        this._clipStats.clippedTicks += cast.clippedTicks;
      }
    }

    if (this.addDotDowntimeStats(cast)) {
      this._dotDowntimeStats.castCount++;
      this._dotDowntimeStats.totalDowntime += cast.dotDowntime as number;
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

      if (next.hasClipStats) {
        this._clipStats.castCount += next.clipStats.castCount;
        this._clipStats.clipCount += next.clipStats.clipCount;
        this._clipStats.clippedTicks += next.clipStats.clippedTicks;
        this._clipStats.expectedTicks += next.clipStats.expectedTicks;
      }

      if (next.hasDotDowntimeStats) {
        this._dotDowntimeStats.castCount += next.dotDowntimeStats.castCount;
        this._dotDowntimeStats.totalDowntime += next.dotDowntimeStats.totalDowntime;
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
      this._channelStats.avgNextCastLatency = this._channelStats.totalNextCastLatency / this._channelStats.castCount;
    }

    if (this.hasCooldownStats) {
      this._cooldownStats.avgOffCooldown = this._cooldownStats.totalOffCooldown / this._cooldownStats.castCount;
    }

    if (this.hasDotDowntimeStats) {
      this._dotDowntimeStats.avgDowntime = this._dotDowntimeStats.totalDowntime / this._dotDowntimeStats.castCount;
    }

    if (this.hasClipStats && this._clipStats.expectedTicks > 0) {
      this._clipStats.missedTickPercent = this._clipStats.clippedTicks / this._clipStats.expectedTicks;
    }

    // Calculate active duration
    this._sortedCasts = this.casts.sort((a, b) => a.castStart - b.castStart);
    let window = { start: 0, end: 0 };
    let activeDuration = 0;

    for (const next of this.casts) {
      const { start, end } = this.getEffectiveWindow(next);

      if (window.end === 0 || start > window.end) {
        activeDuration += (end - start);
        window = { start, end };
      } else if (start <= window.end && end > window.end) {
        activeDuration += (end - window.end);
        window.end = end;
      }
    }

    this._activeDuration = activeDuration;
    this.recalculate = false;
  }

  private getEffectiveWindow(cast: CastDetails) {
    const spellData = SpellData[cast.spellId];
    const start = cast.castStart;
    let end;

    // For DoT/Channel, use the timestamp of the last instance
    if ([DamageType.DOT, DamageType.CHANNEL].includes(spellData.damageType) && cast.instances.length > 0) {
      end = cast.instances[cast.instances.length - 1].timestamp;
    }

    // If there's a cast time, use that
    else if (cast.castEnd - cast.castStart >= 950) {
      end = cast.castEnd;
    }

    // If all else fails, assume 1.5s GCD
    else {
      end = cast.castStart + 1500;
    }

    return { start, end };
  }

  private addChannelStats(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.CHANNEL && cast.nextCastLatency !== undefined;
  }

  private addCooldownStats(cast: CastDetails) {
    return SpellData[cast.spellId].cooldown > 0 && cast.timeOffCooldown !== undefined;
  }

  private addClipStats(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.DOT;
  }

  private addDotDowntimeStats(cast: CastDetails) {
    return SpellData[cast.spellId].damageType === DamageType.DOT && cast.dotDowntime !== undefined;
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

export interface IDotClipStats {
  castCount: number;
  clipCount: number;
  clippedTicks: number;
  expectedTicks: number;
  missedTickPercent: number;
}

export interface IDotDownTimeStats {
  castCount: number;
  totalDowntime: number;
  avgDowntime: number
}
