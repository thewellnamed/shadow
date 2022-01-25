import { BaseStats } from 'src/app/report/stats/base.stats';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';
import { format } from 'src/app/report/stats/stat-utils';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class ChannelStats extends BaseStats {
  fields(stats: SpellStats) {
    const spellData = this.spellData(stats);
    if (spellData?.damageType !== DamageType.CHANNEL) {
      return [];
    }

    return [
      this.field({
        label: 'Avg MF latency',
        value: format(stats.avgNextCastLatency, 2, 's'),
        highlight: this.highlight.channelLatency(stats)
      }),

      this.field({
        label: 'Early MF Clips',
        value: stats.channelStats.clippedEarlyCount,
        highlight: this.highlight.clippedEarly(stats)
      }),

      this.field({
        label: 'Clipped MF DPS',
        value: `~${format(this.clippedDps(stats), 1)}`,
        highlight: this.highlight.clippedEarlyDps(this.clippedDps(stats))
      })
    ];
  }

  private clippedDps(stats: SpellStats) {
    return stats.channelStats.totalClippedDamage / this.analysis.encounter.durationSeconds;
  }
}
