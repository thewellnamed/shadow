import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { CastStats } from 'src/app/report/models/cast-stats';

export enum Status {
  NORMAL,
  NOTICE,
  WARNING
}

export class StatEvaluator {
  // if value > x, return this status
  public static thresholds: IStatThresholds = {
    dotDowntime: {
      [Status.WARNING]: 4,
      [Status.NOTICE]: 2
    },

    timeOffCooldown: {
      [Status.WARNING]: 4,
      [Status.NOTICE]: 2
    },

    // post-channel latency
    channelLatency: {
      [Status.NOTICE]: 0.3
    },

    avgChannelLatency: {
      [Status.WARNING]: 0.4,
      [Status.NOTICE]: 0.25
    },

    // post-cast latency for other spell types
    castLatency: {
      [Status.WARNING]: 0.1,
      [Status.NOTICE]: 0.05
    },

    avgCastLatency: {
      [Status.WARNING]: 0.15,
      [Status.NOTICE]: 0.075
    },

    clippedDotPercent: {
      [Status.WARNING]: 0.1,
      [Status.NOTICE]: 0.05
    },

    // MF clipped early
    clippedEarlyPercent: {
      [Status.WARNING]: 0.05,
      [Status.NOTICE]: 0.02
    },

    // Clipped MF DPS
    clippedEarlyDps: {
      [Status.WARNING]: 10,
      [Status.NOTICE]: 5.0
    }
  };

  /**
   * Evaluate overall status for this cast
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  overall(cast: CastDetails): Status {
    // note: conditions are in order of priority for determining severity
    const spellData = SpellData[cast.spellId];

    if (cast.resisted) {
      return Status.NORMAL;
    }

    if (cast.immune) {
      return Status.NOTICE;
    }

    if (cast.clippedPreviousCast) {
      return Status.WARNING;
    }

    if (cast.clippedEarly) {
      return Status.WARNING;
    }

    if (this.checkThresholds(cast, Status.WARNING)) {
      return Status.WARNING;
    }

    if (this.missingTicks(cast, spellData)) {
      return Status.NOTICE;
    }

    if (this.checkThresholds(cast, Status.NOTICE)) {
      return Status.NOTICE;
    }

    return Status.NORMAL;
  }

  hits(cast: CastDetails): Status {
    const spellData = SpellData[cast.spellId];

    if (cast.clippedEarly) {
      return Status.WARNING;
    }

    if (this.missingTicks(cast, spellData)) {
      return Status.NOTICE;
    }

    return Status.NORMAL;
  }

  dotClip(cast: CastDetails) {
    return cast.clippedPreviousCast ? Status.WARNING : Status.NORMAL;
  }

  dotClipPercent(stats: CastStats): Status {
    return this.threshold('clippedDotPercent', stats.clipStats.clippedPercent);
  }

  downtime(statName: string, dotDowntime: number|undefined): Status {
    return this.threshold(statName, dotDowntime);
  }

  earlyClips(data: CastDetails|CastStats): Status {
    if (data instanceof CastStats) {
      return this.threshold('clippedEarlyPercent', data.channelStats.clippedEarlyPercent);
    }

    return ((data as CastDetails).clippedEarly) ? Status.WARNING : Status.NORMAL;
  }

  missingTicks(cast: CastDetails, spellData: ISpellData) {
    const hitPercent = cast.hits / spellData.maxDamageInstances;

    return spellData.damageType === DamageType.DOT &&
      !cast.failed &&
      cast.hits < spellData.maxDamageInstances &&
      (!cast.truncated || hitPercent < 0.5);
  }

  threshold(statName: string, value: number|undefined): Status {
    value = value || 0;

    if (this.aboveThreshold(statName, value, Status.WARNING)) {
      return Status.WARNING;
    }

    if (this.aboveThreshold(statName, value, Status.NOTICE)) {
      return Status.NOTICE;
    }

    return Status.NORMAL;
  }

  private checkThresholds(cast: CastDetails, level: Status): boolean {
    for (const statName of Object.keys(StatEvaluator.thresholds)) {
      const stat = (cast as any)[statName] as number;
      if (this.aboveThreshold(statName, stat, level)) {
        return true;
      }
    }

    return false;
  }

  private aboveThreshold(statName: string, value: number|undefined, level: Status) {
    return value !== undefined && value > StatEvaluator.thresholds[statName][level];
  }
}

interface IStatThresholds {
  [statName: string]: IStatThresholdValues;
}

interface IStatThresholdValues {
  [level: number]: number;
}
