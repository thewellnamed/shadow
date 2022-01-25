import { BaseStats } from 'src/app/report/stats/base.stats';
import { format } from 'src/app/report/stats/stat-utils';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class EncounterStats extends BaseStats {
  fields(stats: SpellStats) {
    return [
      this.field({ label: 'Avg Spellpower', value: format(stats.avgSpellpower) }),
      this.field({ label: 'Avg Haste', value: format(stats.avgHaste * 100, 1, '%') }),
      this.field({ label: 'GCD Usage', value: this.gcdUsage(stats) })
    ];
  }
}
