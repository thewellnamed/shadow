import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellStats } from 'src/app/report/models/spell-stats';

/**
 * Summarize performance for a single spell over an encounter
 */
export class SpellSummary extends SpellStats {
  spellId: SpellId;
  spellData: ISpellData;

  constructor(spellId: SpellId) {
    super();
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
  }
}
