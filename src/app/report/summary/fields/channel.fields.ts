import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { DamageType } from 'src/app/logs/models/spell-data';
import { format, latency } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class ChannelFields extends BaseFields {
  fields(stats: CastStats, forSummary = false) {
    const spellData = this.spellData(stats);
    if (spellData?.damageType !== DamageType.CHANNEL) {
      return [];
    }

    const spellLabel = forSummary ? ' MF' : '';

    return [
      this.field({
        label: `Avg${spellLabel} Latency`,
        value: latency(stats.avgNextCastLatency),
        highlight: this.highlight.channelLatency(stats)
      }),

      this.field({
        label: `Early${spellLabel} Clips`,
        value: this.clipString(stats),
        highlight: this.highlight.clippedEarly(stats)
      }),

      this.field({
        label: `Clipped${spellLabel} DPS`,
        value: this.clippedDpsString(stats),
        highlight: this.highlight.clippedEarlyDps(this.clippedDps(stats))
      }),
      this.break()
    ];
  }

  private clipString(stats: CastStats) {
    let str = stats.channelStats.clippedEarlyCount.toString();

    if (stats.channelStats.clippedEarlyPercent > 0) {
      str += ` (${format(stats.channelStats.clippedEarlyPercent * 100, 1, '%')})`;
    }

    return str;
  }

  private clippedDpsString(stats: CastStats) {
    const clippedDps = this.clippedDps(stats);

    if (clippedDps === 0) {
      return clippedDps;
    }

    return `~${format(clippedDps, 1)}`;
  }

  private clippedDps(stats: CastStats) {
    return stats.channelStats.totalClippedDamage / this.analysis.encounter.durationSeconds;
  }
}
