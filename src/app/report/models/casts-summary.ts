import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellSummary } from 'src/app/report/models/spell-summary';
import { SpellData } from 'src/app/logs/models/spell-data';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class CastsSummary {
  allCasts: CastDetails[];
  spells: {[spellId: number]: SpellSummary};

  private _stats: SpellStats;

  constructor(data: CastDetails[]) {
    this.allCasts = data;

    this.spells = Object.keys(SpellData)
      .map((k) => parseInt(k))
      .reduce((spells, spellId) => {
        spells[spellId] = new SpellSummary(spellId);
        return spells;
      }, {} as {[spellId: number]: SpellSummary});

    data.reduce((spells, details) => {
      spells[details.spellId].addCast(details);
      return spells;
    }, this.spells);
  }

  getSpellSummary(spellId: number) {
    return this.spells[spellId];
  }

  get targetIds(): number[] {
    let ids: number[] = [];
    for (const summary of Object.values(this.spells)) {
      ids = ids.concat(summary.targetIds);
    }

    return [... new Set<number>(ids)];
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
    const stats = new SpellStats();
    stats.merge(Object.values(this.spells));

    this._stats = stats;
  }
}
