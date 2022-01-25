import { BaseStats, StatFields } from 'src/app/report/stats/base.stats';
import { format } from 'src/app/report/stats/stat-utils';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { ISpellData, SpellData } from 'src/app/logs/models/spell-data';

export class DotStats extends BaseStats {
  fields(stats: SpellStats) {
    return this.hitStats(stats)
      .concat([
        this.field({
          label: 'Avg Latency',
          value: format(stats.avgNextCastLatency, 2, 's'),
          highlight: this.highlight.castLatency(stats)
        })
      ])
      .concat(this.downtimeStats(stats))
      .concat(this.clipStats(stats));
  }

  private hitStats(stats: SpellStats): StatFields {
    const spellData = this.spellData(stats);
    if (!spellData) {
      return [];
    }

    return [
      this.field({ label: 'Hits', value: stats.totalHits }),
      this.field({ label: 'Hits/Cast', value: `${format(stats.avgHitCount)}/${spellData.maxDamageInstances}` }),
      this.field({ label: 'Avg Hit', value: format(stats.avgHit) }),
      this.field({ label: 'Damage/GCD', value: format(stats.damagePerGcd, 0) }),
      this.break()
    ];
  }

  private downtimeStats(stats: SpellStats): StatFields {
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

  private clipStats(stats: SpellStats): StatFields {
    if (!stats.hasClipStats) {
      return [];
    }

    return [
      this.field({
        label: 'Clipped DoTs',
        value: stats.clipStats.clipCount,
        highlight: this.highlight.clippedDots(stats)
      }),
      this.break()
    ];
  }
}
