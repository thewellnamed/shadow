import { BaseFields, StatFields } from 'src/app/report/summary/fields/base.fields';
import { format } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class DotFields extends BaseFields {
  fields(stats: CastStats) {
    const spellData = this.spellData(stats);
    let fields: StatFields = [];

    if (spellData) {
      fields = [this.field({
        label: 'Avg Latency',
        value: format(stats.avgNextCastLatency, 2, 's'),
        highlight: this.highlight.castLatency(stats)
      })];
    }

    return fields
      .concat(this.downtimeStats(stats))
      .concat(this.clipStats(stats));
  }

  private downtimeStats(stats: CastStats): StatFields {
    if (!stats.hasDotDowntimeStats) {
      return [];
    }
    return[
      this.field({
        label: 'Avg DoT Downtime',
        value: format(stats.dotDowntimeStats.avgDowntime, 1, 's'),
        highlight: this.highlight.dotDowntime(stats)
      })
    ];
  }

  private clipStats(stats: CastStats): StatFields {
    if (!stats.hasClipStats) {
      return [];
    }

    return [
      this.field({
        label: 'Clipped DoTs',
        value: stats.clipStats.clipCount,
        highlight: this.highlight.clippedDots(stats)
      })
    ];
  }
}
