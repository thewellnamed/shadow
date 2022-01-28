import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { duration } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class SummaryFields extends BaseFields {
  fields(stats: CastStats) {
    return [
      this.field({ label: 'Casts', value: stats.castCount }),
      this.field({ label: 'Damage', value: stats.totalDamage }),
      this.field({ label: 'Active DPS', value: this.activeDps(stats) }),
      this.field({ label: 'Active Time', value: duration(stats.activeDuration, 'M:ss') }),
      this.break()
    ];
  }
}
