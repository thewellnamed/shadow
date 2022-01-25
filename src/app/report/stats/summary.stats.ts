import { BaseStats } from 'src/app/report/stats/base.stats';
import { duration } from 'src/app/report/stats/stat-utils';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class SummaryStats extends BaseStats {
  fields(stats: SpellStats) {
    return [
      this.field({ label: 'Casts', value: stats.castCount }),
      this.field({ label: 'Damage', value: stats.totalDamage }),
      this.field({ label: 'Active DPS', value: this.activeDps(stats) }),
      this.field({ label: 'Active Time', value: duration(stats.activeDuration, 'M:ss') }),
      this.break()
    ];
  }
}
