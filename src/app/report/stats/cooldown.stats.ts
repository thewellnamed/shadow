import { BaseStats } from 'src/app/report/stats/base.stats';
import { format } from 'src/app/report/stats/stat-utils';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class CooldownStats extends BaseStats {
  fields(stats: SpellStats) {
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
