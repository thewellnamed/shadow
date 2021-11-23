import { CastDetails } from 'src/app/report/models/cast-details';
import { IHitStats, SpellSummary } from 'src/app/report/models/spell-summary';
import { SpellData } from 'src/app/logs/models/spell-data';

export class CastsSummary {
  allCasts: CastDetails[];
  allTargets: number[];
  spells: {[spellId: number]: SpellSummary};

  private _recalculate = true;
  private _stats: IHitStats;

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

    const targetIds = this.allCasts.map((c) => c.targetId);
    this.allTargets = [... new Set(targetIds)];
  }

  getSpellSummary(spellId: number) {
    return this.spells[spellId];
  }

  get stats() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._stats;
  }

  private get recalculate() {
    return this._recalculate || Object.values(this.spells).some((summary) => summary.recalculate);
  }

  private calculate() {
    const stats = {
      spellId: 0,
      castCount: 0,
      minTimestamp: 0,
      maxTimestamp: 0,
      successCount: 0,
      totalDamage: 0,
      totalHits: 0,
      totalWeightedSpellpower: 0,
      avgDamage: 0,
      avgHit: 0,
      avgHitCount: 0,
      avgSpellpower: 0,
      hasChannelStats: false,
      hasDowntimeStats: false
    };

    const spellData = Object.values(this.spells);

    for (const summary of spellData) {
      stats.castCount += summary.castCount;
      stats.successCount += summary.successCount;
      stats.totalDamage += summary.totalDamage;
      stats.totalHits += summary.totalHits;
      stats.totalWeightedSpellpower += summary.totalWeightedSpellpower;

      if (stats.minTimestamp === 0 || summary.minTimestamp < stats.minTimestamp) {
        stats.minTimestamp = summary.minTimestamp;
      }

      if (stats.maxTimestamp === 0 || summary.maxTimestamp > stats.maxTimestamp) {
        stats.maxTimestamp = summary.maxTimestamp;
      }

      stats.avgSpellpower = stats.totalWeightedSpellpower / stats.totalDamage;
    }

    this._stats = stats;
    this._recalculate = false;
  }
}
