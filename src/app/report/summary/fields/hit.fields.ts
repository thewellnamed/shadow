import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { format } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class HitFields extends BaseFields {
  fields(stats: CastStats) {
    const spellData = this.spellData(stats);

    if (!spellData?.maxDamageInstances) {
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
}
