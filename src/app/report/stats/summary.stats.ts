import { BaseStats } from 'src/app/report/stats/base.stats';
import { duration } from 'src/app/report/stats/stat-utils';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

export class SummaryStats extends BaseStats {
  fields(stats: SpellStats, _spellId = SpellId.NONE) {
    return [
      this.field({ label: 'Casts', value: stats.castCount }),
      this.field({ label: 'Damage', value: stats.totalDamage }),
      this.field({ label: 'Active DPS', value: this.activeDps(stats) }),
      this.field({ label: 'Active Time', value: duration(stats.activeDuration, 'M:ss') }),
      this.break()
    ];
  }
}
