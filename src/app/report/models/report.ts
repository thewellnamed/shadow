import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { Spell } from 'src/app/logs/models/spell-data';
import { CastStats } from 'src/app/report/models/cast-stats';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';

export class Report {
  analysis: PlayerAnalysis;
  casts: CastDetails[];
  spells: {[spellId: number]: SpellStats};
  targetIds: number[];
  private _stats: CastStats;

  constructor(analysis: PlayerAnalysis, casts: CastDetails[]) {
    this.analysis = analysis;
    this.casts = casts;

    this.spells = Object.keys(Spell.data)
      .map((k) => parseInt(k))
      .reduce((spells, spellId) => {
        spells[spellId] = new SpellStats(analysis, spellId);
        return spells;
      }, {} as {[spellId: number]: SpellStats});

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

  getSpellStats(spellId: number) {
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
    const stats = new CastStats(this.analysis);
    stats.merge(Object.values(this.spells));
    this._stats = stats;
  }
}
