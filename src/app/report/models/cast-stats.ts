import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, Spell } from 'src/app/logs/models/spell-data';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export class CastStats {
  targetId: number|undefined;
  castCount = 0;
  successCount = 0;
  minTimestamp = 0;
  maxTimestamp = 0;
  totalDamage = 0;
  totalHits = 0;
  latencyCount = 0;
  gcds = 0;

  recalculate = true;

  protected analysis: PlayerAnalysis;
  protected _totalWeightedSpellpower = 0;
  protected _totalNextCastLatency = 0;
  protected _totalWeightedHaste = 0;

  private _casts: CastDetails[] = [];
  private _sortedCasts?: CastDetails[];
  private _activeDuration = 0;
  private _targetIds: Set<number> = new Set();
  private _hitCounts: Set<number> = new Set();
  private _avgDamage = 0;
  private _damagePerGcd = 0;
  private _avgHitCount = 0;
  private _avgHit = 0;
  private _avgHaste = 0;
  private _avgSpellpower = 0;
  private _avgNextCastLatency: number|undefined = undefined;
  private _targetStats: IStatsMap = {};

  private _channelStats: IChannelStats = {
    castCount: 0,
    clippedEarlyCount: 0,
    clippedEarlyPercent: 0,
    totalClippedDamage: 0,
  };

  private _cooldownStats: ICooldownStats = {
    castCount: 0,
    totalOffCooldown: 0,
    avgOffCooldown: undefined
  };

  private _clipStats: IDotClipStats = {
    castCount: 0,
    clipCount: 0,
    clippedTicks: 0,
    clippedPercent: 0,
    expectedTicks: 0
  };

  private _dotDowntimeStats: IDotDownTimeStats = {
    castCount: 0,
    totalDowntime: 0,
    avgDowntime: undefined
  };

  constructor(analysis: PlayerAnalysis, targetId?: number, casts?: CastDetails[]) {
    this.analysis = analysis;
    this.targetId = targetId;

    if (casts) {
      this.addCasts(casts);
    }
  }

  get targetIds() {
    if (this.targetId !== undefined) {
      return [this.targetId];
    }

    return [... this._targetIds];
  }

  get hitCounts(): number[] {
    return [... this._hitCounts].sort();
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

  get damagePerGcd() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._damagePerGcd;
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

  get avgHaste() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._avgHaste;
  }

  get avgNextCastLatency() {
    if (this.recalculate) {
      this.updateStats();
    }

    return this._avgNextCastLatency;
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

  targetStats(targetId: number): CastStats {
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

    if (this.targetId === undefined) {
      const targetIds = cast.targetId > 0 ? [cast.targetId] : cast.allTargets;
      targetIds.forEach((t) => {
        if (t !== undefined) {
          this._targetIds.add(t);
          if (!this._targetStats.hasOwnProperty(t)) {
            this._targetStats[t] = this.createTargetStats(t);
          }
          this._targetStats[t].addCast(cast);
        }
      });
    }

    const spellData = Spell.get(cast.spellId, cast.haste);

    if (spellData.gcd) {
      // if there was pushback, count it as latency or as time lost.
      const castTime = Math.min(cast.castTimeMs / 1000, cast.baseCastTime);
      const gcds = castTime > cast.gcd ? (castTime / cast.gcd) : 1;

      this.gcds += gcds;
      this._totalWeightedHaste += cast.haste * gcds;
    }

    // exclude early MF clips from average latency
    // todo -- might need to revisit this for overall latency
    if (cast.nextCastLatency !== undefined && !cast.clippedEarly) {
      this._totalNextCastLatency += cast.nextCastLatency;
      this.latencyCount++;
    }

    // stats below are specific to damage spells...
    if (spellData.damageType === DamageType.NONE) {
      return;
    }

    this._hitCounts.add(cast.hits);
    const totalDamage = this.evaluateDamage(cast);

    if (totalDamage > 0) {
      this.successCount++;
      this.totalDamage += totalDamage;
      this.totalHits += this.evaluateHits(cast, totalDamage);
      this._totalWeightedSpellpower += (cast.spellPower * totalDamage);
    } else {
      this._totalWeightedSpellpower += cast.spellPower;
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

      if (cast.clippedEarly) {
        this._channelStats.clippedEarlyCount++;

        // assume one lost tick for the same damage as the last actual tick
        // discounted by a factor representing how far away the next tick really was
        const lostDamage = cast.instances[cast.instances.length - 1].totalDamage
        this._channelStats.totalClippedDamage += lostDamage * cast.earlyClipLostDamageFactor;
      }
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

  merge(stats: CastStats|CastStats[]) {
    if (!Array.isArray(stats)) {
      stats = [stats];
    }

    for (let next of stats) {
      // skip on target mismatch -- we should never be calling merge this way though!
      if (this.targetId && next.targetId && this.targetId !== next.targetId) {
        continue;
      }

      // If merging general stats to target stats, only map matching target from next, if found
      if (this.targetId && next.targetId === undefined) {
        next = next.targetStats(this.targetId);
        if (!next) {
          continue;
        }
      }

      this._casts = this._casts.concat(next.casts);
      this.castCount += next.castCount;

      this.successCount += next.successCount;
      this.latencyCount += next.latencyCount;
      this.totalDamage += next.totalDamage;
      this.totalHits += next.totalHits;
      this.gcds += next.gcds;

      this._totalWeightedSpellpower += next._totalWeightedSpellpower;
      this._totalWeightedHaste += next._totalWeightedHaste;
      this._totalNextCastLatency += next._totalNextCastLatency;

      if (this.minTimestamp === 0 || next.minTimestamp < this.minTimestamp) {
        this.minTimestamp = next.minTimestamp;
      }

      if (this.maxTimestamp === 0 || next.maxTimestamp > this.maxTimestamp) {
        this.maxTimestamp = next.maxTimestamp;
      }

      if (next.hasChannelStats) {
        this._channelStats.castCount += next.channelStats.castCount;
        this._channelStats.clippedEarlyCount += next.channelStats.clippedEarlyCount;
        this._channelStats.totalClippedDamage += next.channelStats.totalClippedDamage;
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

      if (this.targetId === undefined) {
        for (const targetId of next.targetIds) {
          const targetStats = next.targetStats(targetId);
          this._targetIds.add(targetId);

          if (this._targetStats.hasOwnProperty(targetId)) {
            this._targetStats[targetId].merge(targetStats);
          } else {
            this._targetStats[targetId] = this.createTargetStats(targetId);
            this._targetStats[targetId].addCasts(targetStats.casts);
          }
        }
      }
    }

    this._sortedCasts = undefined;
    this.recalculate = true;
  }

  updateStats() {
    this._avgDamage = this.totalDamage / this.castCount;
    this._damagePerGcd = this.totalDamage / this.gcds;
    this._avgHit = this.totalHits > 0 ? this.totalDamage / this.totalHits : 0;
    this._avgHitCount = this.successCount > 0 ? this.totalHits / this.successCount : 0;
    this._avgSpellpower = this._totalWeightedSpellpower / (this.totalDamage || this.castCount);
    this._avgNextCastLatency = this._totalNextCastLatency / this.latencyCount;
    this._avgHaste = this._totalWeightedHaste / this.gcds;

    if (this.hasChannelStats) {
      this._channelStats.clippedEarlyPercent = this._channelStats.clippedEarlyCount / this._channelStats.castCount;
    }

    if (this.hasCooldownStats) {
      this._cooldownStats.avgOffCooldown = this._cooldownStats.totalOffCooldown / this._cooldownStats.castCount;
    }

    if (this.hasDotDowntimeStats) {
      this._dotDowntimeStats.avgDowntime = this._dotDowntimeStats.totalDowntime / this._dotDowntimeStats.castCount;
    }

    if (this.hasClipStats && this._clipStats.expectedTicks > 0) {
      this._clipStats.clippedPercent = this._clipStats.clipCount / this._clipStats.castCount;
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
    const spellData = Spell.get(cast.spellId);
    const start = cast.castStart;
    let end;

    // For DoT/Channel, use the timestamp of the last instance
    if ([DamageType.DOT, DamageType.CHANNEL].includes(spellData.damageType) && cast.instances.length > 0) {
      end = cast.instances[cast.instances.length - 1].timestamp;
    }

    // If cast time is longer than the GCD
    else if ((cast.castTimeMs/1000) > cast.gcd) {
      end = cast.castEnd;
    }

    // Else use the GCD. Off-GCD spells (bombs) have gcd set to 0
    // That's correct for some use cases, like latency, but it's not useful here, so we'll use 1 instead.
    else {
      end = cast.castStart + (Math.max(cast.gcd, 1) * 1000);
    }

    return { start, end };
  }

  private addChannelStats(cast: CastDetails) {
    return Spell.get(cast.spellId).damageType === DamageType.CHANNEL;
  }

  private addCooldownStats(cast: CastDetails) {
    return Spell.get(cast.spellId).cooldown > 0 && cast.timeOffCooldown !== undefined;
  }

  private addClipStats(cast: CastDetails) {
    return Spell.get(cast.spellId).damageType === DamageType.DOT;
  }

  private addDotDowntimeStats(cast: CastDetails) {
    return Spell.get(cast.spellId).damageType === DamageType.DOT && cast.dotDowntime !== undefined;
  }

  private evaluateDamage(cast: CastDetails) {
    if (this.targetId !== undefined && cast.targetId !== this.targetId) {
      // find any damage instances on target and add those up
      return cast.instances.reduce((sum, instance) => {
        if (instance.targetId === this.targetId) {
          sum += instance.totalDamage;
        }

        return sum;
      }, 0);
    } else {
      return cast.totalDamage;
    }
  }

  private evaluateHits(cast: CastDetails, totalDamage: number) {
    if (cast.instances.length > 1) {
      if (this.targetId) {
        return cast.instances.filter((i) => i.targetId === this.targetId && i.totalDamage > 0).length;
      } else {
        return cast.hits;
      }
    }

    if (totalDamage > 0) {
      return 1;
    }

    return 0;
  }

  // annotation really should be SpellStats (or child class)
  // but that seems to annoy typescript...
  protected createTargetStats(targetId: number): any {
    return new CastStats(this.analysis, targetId);
  }
}

export interface IStatsMap {
  [key: number]: CastStats;
}

export interface IChannelStats {
  castCount: number;
  clippedEarlyCount: number;
  clippedEarlyPercent: number;
  totalClippedDamage: number;
}

export interface ICooldownStats {
  castCount: number;
  totalOffCooldown: number;
  avgOffCooldown: number|undefined;
}

export interface IDotClipStats {
  castCount: number;
  clipCount: number;
  clippedTicks: number;
  expectedTicks: number;
  clippedPercent: number;
}

export interface IDotDownTimeStats {
  castCount: number;
  totalDowntime: number;
  avgDowntime: number|undefined;
}
