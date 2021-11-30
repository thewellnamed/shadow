import { CastDetails } from 'src/app/report/models/cast-details';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellStats } from 'src/app/report/models/spell-stats';

export enum Status {
  NORMAL,
  NOTICE,
  WARNING
}

export class StatHighlights {
  // colored bar styles for highlighting a cast
  public static readonly statusHighlights = {
    [Status.NORMAL]: 'normal',
    [Status.NOTICE]: 'notice',
    [Status.WARNING]: 'warning'
  };

  public static readonly textHighlights = {
    [Status.NORMAL]: 'table-accent',
    [Status.NOTICE]: 'text-notice',
    [Status.WARNING]: 'text-warning'
  };

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

    nextCastLatency: {
      [Status.WARNING]: 0.5,
      [Status.NOTICE]: 0.25
    },

    missedTickPercent: {
      [Status.WARNING]: 0.02,
      [Status.NOTICE]: 0
    }
  };

  /**
   * Overall status highlight
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  overall(cast: CastDetails) {
    return this.statusHighlight(this.evaluate(cast));
  }

  /**
   * Highlight tick count for DoT/Channel
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  ticks(cast: CastDetails) {
    return this.textHighlight(this.evaluateTicks(cast));
  }

  dotDowntime(data: CastDetails|SpellStats) {
    const downtime = data instanceof CastDetails ? data.dotDowntime : data.dotDowntimeStats.avgDowntime;
    return this.textHighlight(this.evaluateDowntime('dotDowntime', downtime));
  }

  cooldown(data: CastDetails|SpellStats) {
    const downtime = data instanceof CastDetails ? data.timeOffCooldown : data.cooldownStats.avgOffCooldown;
    return this.textHighlight(this.evaluateDowntime('timeOffCooldown', downtime));
  }

  /**
   * Higlight next-cast latency for channels
   * @param {CastDetails|SpellStats} data
   * @return {string} CSS style
   */
  latency(data: CastDetails|SpellStats) {
    const value = data instanceof CastDetails ? data.nextCastLatency : data.channelStats.avgNextCastLatency;
    return this.textHighlight(this.evaluateLatency(value));
  }

  /**
   * Highlight clipped tick percent
   * @param {SpellStats} stats
   * @return {string} CSS Style
   */
  clippedTicks(stats: SpellStats) {
    return this.textHighlight(this.evaluateDotClips(stats));
  }

  /**
   * Highlight clipped previous cast
   * @param {SpellStats} stats
   * @return {string} CSS Style
   */
  clippedCast(cast: CastDetails) {
    return this.textHighlight(cast.clippedPreviousCast ? Status.WARNING : Status.NORMAL);
  }

  /**
   * Evaluate overall status for this cast
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  private evaluate(cast: CastDetails): Status {
    // note: conditions are in order of priority for determining severity
    const spellData = SpellData[cast.spellId];

    if (cast.resisted) {
      return Status.NORMAL;
    }

    if (cast.clippedPreviousCast) {
      return Status.WARNING;
    }

    if (this.clippedMindFlay(cast)) {
      return Status.WARNING;
    }

    if (this.checkThresholds(cast, Status.WARNING)) {
      return Status.WARNING;
    }

    // TODO -- detect that target has died
    if (this.missingtTicks(cast, spellData)) {
      return Status.NOTICE;
    }

    if (this.checkThresholds(cast, Status.NOTICE)) {
      return Status.NOTICE;
    }

    return Status.NORMAL;
  }

  private evaluateTicks(cast: CastDetails): Status {
    const spellData = SpellData[cast.spellId];

    if (this.clippedMindFlay(cast)) {
      return Status.WARNING;
    }

    if (this.missingtTicks(cast, spellData)) {
      return Status.NOTICE;
    }

    return Status.NORMAL;
  }

  private evaluateLatency(latency: number|undefined): Status {
    return this.thresholdStatus('nextCastLatency', latency);
  }

  private evaluateDotClips(stats: SpellStats): Status {
    return this.thresholdStatus('missedTickPercent', stats.clipStats.missedTickPercent);
  }

  private evaluateDowntime(statName: string, dotDowntime: number|undefined): Status {
    return this.thresholdStatus(statName, dotDowntime);
  }

  // TODO -- detect if target has died
  private clippedMindFlay(cast: CastDetails) {
    return (cast.spellId === SpellId.MIND_FLAY && cast.ticks < 2);
  }

  // TODO -- detect if target has died
  private missingtTicks(cast: CastDetails, spellData: ISpellData) {
    return spellData.damageType === DamageType.DOT && cast.ticks < spellData.maxDamageInstances;
  }

  private checkThresholds(cast: CastDetails, level: Status): boolean {
    for (const statName of Object.keys(StatHighlights.thresholds)) {
      const stat = (cast as any)[statName] as number;
      if (this.aboveThreshold(statName, stat, level)) {
        return true;
      }
    }

    return false;
  }

  private thresholdStatus(statName: string, value: number|undefined): Status {
    value = value || 0;

    if (this.aboveThreshold(statName, value, Status.WARNING)) {
      return Status.WARNING;
    }

    if (this.aboveThreshold(statName, value, Status.NOTICE)) {
      return Status.NOTICE;
    }

    return Status.NORMAL;
  }

  private aboveThreshold(statName: string, value: number|undefined, level: Status) {
    return value !== undefined && value > StatHighlights.thresholds[statName][level];
  }

  private textHighlight(status: Status) {
    return StatHighlights.textHighlights[status];
  }

  private statusHighlight(status: Status) {
    return StatHighlights.statusHighlights[status];
  }
}

interface IStatThresholds {
  [statName: string]: IStatThresholdValues;
}

interface IStatThresholdValues {
  [level: number]: number;
}
