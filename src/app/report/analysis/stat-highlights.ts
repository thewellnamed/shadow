import { CastDetails } from 'src/app/report/models/cast-details';
import { CastStats } from 'src/app/report/models/cast-stats';
import { Status, StatEvaluator } from 'src/app/report/analysis/stat-evaluator';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export class StatHighlights {
  private analysis: PlayerAnalysis;
  private evaluator: StatEvaluator;

  constructor(analysis: PlayerAnalysis) {
    this.analysis = analysis;
    this.evaluator = new StatEvaluator(analysis);
  }

  // colored bar styles for highlighting a cast
  public static readonly statusHighlights = {
    [Status.NORMAL]: 'normal',
    [Status.NOTICE]: 'notice',
    [Status.WARNING]: 'warning',
    [Status.SUCCESS]: 'success'
  };

  public static readonly textHighlights = {
    [Status.NORMAL]: 'table-accent',
    [Status.NOTICE]: 'text-notice',
    [Status.WARNING]: 'text-warning',
    [Status.SUCCESS]: 'text-success'
  };

  /**
   * Overall status for this cast
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  overall(cast: CastDetails) {
    return this.statusHighlight(this.evaluator.overall(cast));
  }

  /**
   * Hit count for DoT/Channel
   * @param {CastDetails} cast
   * @return {string} CSS style
   */
  hits(cast: CastDetails) {
    return this.textHighlight(this.evaluator.hits(cast));
  }

  /**
   * DoT downtime
   * @param data
   */
  dotDowntime(data: CastDetails|CastStats) {
    const downtime = data instanceof CastDetails ? data.dotDowntime : data.dotDowntimeStats.avgDowntime;
    return this.textHighlight(this.evaluator.downtime('dotDowntime', downtime));
  }

  /**
   * Time off cooldown for MB/Death
   * @param data
   */
  cooldown(data: CastDetails|CastStats) {
    const downtime = data instanceof CastDetails ? data.timeOffCooldown : data.cooldownStats.avgOffCooldown;
    return this.textHighlight(this.evaluator.downtime('timeOffCooldown', downtime));
  }

  /**
   * Early MF clipping
   * @param data
   */
  clippedEarly(data: CastDetails|CastStats) {
    return this.textHighlight(this.evaluator.earlyClips(data));
  }

  /**
   * DPS lost to early MF clipping
   * @param lostDps
   */
  clippedEarlyDps(lostDps: string|number) {
    return this.textHighlight(this.evaluator.threshold('clippedEarlyDps', parseFloat(lostDps as string)));
  }

  /**
   * Post-channel latency for MF
   * @param {CastDetails|CastStats} data
   * @return {string} CSS style
   */
  channelLatency(data: CastDetails|CastStats) {
    let status;

    if (data instanceof CastDetails) {
      status = this.evaluator.threshold('channelLatency', data.nextCastLatency);
    } else {
      status = this.evaluator.threshold('avgChannelLatency', data.avgNextCastLatency);
    }

    return this.textHighlight(status);
  }

  /**
   * Post-cast latency (non-channeled spells)
   * @param {CastDetails|CastStats} data
   * @return {string} CSS style
   */
  castLatency(data: CastDetails|CastStats) {
    let status;

    if (data instanceof CastDetails) {
      status = this.evaluator.threshold('castLatency', data.nextCastLatency);
    } else {
      status = this.evaluator.threshold('avgCastLatency', data.avgNextCastLatency);
    }

    return this.textHighlight(status);
  }

  /**
   * Highlight clipped DoTs average
   * @param {CastStats} stats
   * @return {string} CSS Style
   */
  clippedDots(stats: CastStats) {
    return this.textHighlight(this.evaluator.dotClipPercent(stats));
  }

  /**
   * Highlight clipped previous cast
   * @param {CastStats} stats
   * @return {string} CSS Style
   */
  clippedDotCast(cast: CastDetails) {
    return this.textHighlight(this.evaluator.dotClip(cast));
  }

  private textHighlight(status: Status) {
    return StatHighlights.textHighlights[status];
  }

  private statusHighlight(status: Status) {
    return StatHighlights.statusHighlights[status];
  }
}
