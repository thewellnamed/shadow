import { BaseFields } from 'src/app/report/summary/fields/base.fields';
import { format } from 'src/app/report/models/stat-utils';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastStats } from 'src/app/report/models/cast-stats';

export class CooldownFields extends BaseFields {
  fields(stats: CastStats) {
    if (!stats.hasCooldownStats) {
      return [];
    }

    return [
      this.field({
        label: 'Avg Off Cooldown',
        value: format(stats.cooldownStats.avgOffCooldown, 1, 's'),
        highlight: this.highlight.cooldown(stats)
      })
    ];
  }
}
