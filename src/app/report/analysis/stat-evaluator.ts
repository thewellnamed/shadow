import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, ISpellData, Spell } from 'src/app/logs/models/spell-data';
import { CastStats } from 'src/app/report/models/cast-stats';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export enum Status {
  NORMAL,
  NOTICE,
  WARNING
}

export class StatEvaluator {
  private analysis: PlayerAnalysis;

  constructor(analysis: PlayerAnalysis) {
    this.analysis = analysis;
  }

  // if value > x, return this status
  public static thresholds: IStatThresholds = {
    dotDowntime: {
      levels: {
        [Status.WARNING]: 5,
        [Status.NOTICE]: 3
      }
    },

    timeOffCooldown: {
      levels: {
        [Status.WARNING]: 5,
        [Status.NOTICE]: 3
      }
    },

    // post-channel latency
    channelLatency: {
      levels: {
        [Status.WARNING]: 0.3,
        [Status.NOTICE]: 0.2
      },
      castProperty: 'nextCastLatency',
      damageTypes: [DamageType.CHANNEL]
    },

    avgChannelLatency: {
      levels: {
        [Status.WARNING]: 0.3,
        [Status.NOTICE]: 0.2
      }
    },

    // post-cast latency for other spell types
    castLatency: {
      levels: {
        [Status.WARNING]: 0.2,
        [Status.NOTICE]: 0.1
      },
      castProperty: 'nextCastLatency',
      damageTypes: [DamageType.NONE, DamageType.DOT, DamageType.AOE, DamageType.DIRECT]
    },

    avgCastLatency: {
      levels: {
        [Status.WARNING]: 0.2,
        [Status.NOTICE]: 0.1
      }
    },

    clippedDotPercent: {
      levels: {
        [Status.WARNING]: 0.1,
        [Status.NOTICE]: 0.05
      }
    },

    // MF clipped early
    clippedEarlyPercent: {
      levels: {
        [Status.WARNING]: 0.05,
        [Status.NOTICE]: 0.02
      }
    },

    // Clipped MF DPS
    clippedEarlyDps: {
      levels: {
        [Status.WARNING]: 10,
        [Status.NOTICE]: 5.0
      }
    }
  };

  /**
   * Evaluate overall status for this cast
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  overall(cast: CastDetails): Status {
    // note: conditions are in order of priority for determining severity
    const spellData = Spell.get(cast.spellId, cast.haste);

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
    const spellData = Spell.get(cast.spellId, cast.haste);

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
      const stat = this.castValue(cast, statName);
      if (this.aboveThreshold(statName, stat, level)) {
        return true;
      }
    }

    return false;
  }


  private castValue(cast: CastDetails, statName: string): number|undefined {
    const threshold = StatEvaluator.thresholds[statName];
    const propName = threshold.castProperty || statName;

    if (threshold.damageTypes && !threshold.damageTypes.includes(Spell.get(cast.spellId).damageType)) {
      return undefined;
    }

    return (cast as any)[propName] as number;
  }

  private aboveThreshold(statName: string, value: number|undefined, level: Status) {
    return value !== undefined && value > StatEvaluator.thresholds[statName].levels[level];
  }
}

interface IStatThresholds {
  [statName: string]: IStatThresholdValues;
}

interface IStatThresholdValues {
  levels: IStatThresholdLevels,
  castProperty?: string;
  damageTypes?: DamageType[];
}

interface IStatThresholdLevels {
  [level: number]: number;
}
