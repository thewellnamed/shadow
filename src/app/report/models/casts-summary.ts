import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellSummary } from 'src/app/report/models/spell-summary';
import { Spells } from 'src/app/logs/models/spell-id.enum';

export class CastsSummary {
  allCasts: CastDetails[];
  spells: {[spellId: number]: SpellSummary};

  constructor(data: CastDetails[]) {
    this.allCasts = data;

    this.spells = Spells.reduce((cbs, spellId) => {
        cbs[spellId] = new SpellSummary(spellId);
        return cbs;
      }, {} as {[spellId: number]: SpellSummary});

    data.reduce((spells, details) => {
      spells[details.spellId].addCast(details);
      return spells;
    }, this.spells);
  }
}
