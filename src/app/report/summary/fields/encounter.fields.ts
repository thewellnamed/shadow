import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { format } from 'src/app/report/models/stat-utils';
import { CastStats } from 'src/app/report/models/cast-stats';

export class EncounterFields extends BaseFields {
  fields(stats: CastStats) {
    return [
      this.field({ label: 'Avg Spellpower', value: format(stats.avgSpellpower) }),
      this.field({ label: 'Avg Haste', value: format(stats.avgHaste * 100, 1, '%') }),
      this.field({ label: 'GCD Usage', value: this.gcdUsage(stats) })
    ];
  }
}
