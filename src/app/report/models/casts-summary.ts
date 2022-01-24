import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellSummary } from 'src/app/report/models/spell-summary';
import { SpellData } from 'src/app/logs/models/spell-data';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class CastsSummary {
  casts: CastDetails[];
  spells: {[spellId: number]: SpellSummary};
  targetIds: number[];
  private _stats: SpellStats;

  constructor(casts: CastDetails[]) {
    this.casts = casts;
    this.spells = Object.keys(SpellData)
      .map((k) => parseInt(k))
      .reduce((spells, spellId) => {
        spells[spellId] = new SpellSummary(spellId);
        return spells;
      }, {} as {[spellId: number]: SpellSummary});

    casts.reduce((spells, details) => {
      spells[details.spellId].addCast(details);
      return spells;
    }, this.spells);

    const allTargets = this.casts.reduce(
      (targets, c) => targets.concat(c.allTargets), [] as number[]
    );
    this.targetIds = [... new Set(allTargets)];
    this.aggregateSpellStats();
  }

  getSpellSummary(spellId: number) {
    return this.spells[spellId];
  }

  get stats() {
    if (this.recalculate) {
      this.aggregateSpellStats();
    }

    return this._stats;
  }

  private get recalculate() {
    return Object.values(this.spells).some((summary) => summary.recalculate);
  }

  private aggregateSpellStats() {
    const stats = new SpellStats([], true);
    stats.merge(Object.values(this.spells));
    this._stats = stats;
  }
}
