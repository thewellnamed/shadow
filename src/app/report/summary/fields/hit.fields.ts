import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { format } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class HitFields extends BaseFields {
  fields(stats: CastStats) {
    return [
      this.field({ label: 'Hits', value: stats.totalHits }),
      this.field({ label: 'Avg Hit', value: format(stats.avgHit) }),
      this.field({ label: 'Crit Rate', value: `${format(stats.critRate * 100, 1, '%')}` }),
      this.field({ label: 'Damage/GCD', value: format(stats.damagePerGcd, 0) }),
      this.break()
    ];
  }
}
