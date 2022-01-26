import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';
import { format } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class ChannelFields extends BaseFields {
  fields(stats: CastStats) {
    const spellData = this.spellData(stats);
    if (spellData?.damageType !== DamageType.CHANNEL) {
      return [];
    }

    return [
      this.field({
        label: 'Avg MF Latency',
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
      }),
      this.break()
    ];
  }

  private clippedDps(stats: CastStats) {
    return stats.channelStats.totalClippedDamage / this.analysis.encounter.durationSeconds;
  }
}
