import { BaseFields, StatFields } from 'src/app/report/summary/fields/base.fields';
import { format } from 'src/app/report/models/stat-utils';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastStats } from 'src/app/report/models/cast-stats';

export class CooldownFields extends BaseFields {
  fields(stats: CastStats) {
    if (!stats.hasCooldownStats) {
      return [];
    }

    const spellData = this.spellData(stats);
    let fields: StatFields = [];

    if (spellData) {
      fields = [
        this.field({
          label: 'Avg Latency',
          value: format(stats.avgNextCastLatency, 2, 's'),
          highlight: this.highlight.castLatency(stats)
        }),
        this.field({
          label: 'Damage/GCD',
          value: format(stats.damagePerGcd, 0)
        })
      ];
    }

    fields = fields.concat([
      this.field({
        label: 'Avg Off Cooldown',
        value: format(stats.cooldownStats.avgOffCooldown, 1, 's'),
        highlight: this.highlight.cooldown(stats)
      })
    ]);

    if (spellData) {
      fields = fields.concat([this.break()]);
    }

    return fields;
  }
}
