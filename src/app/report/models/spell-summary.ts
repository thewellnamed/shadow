import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { SpellStats } from 'src/app/report/models/spell-stats';

/**
 * Summarize performance for a single spell over an encounter
 */
export class SpellSummary extends SpellStats {
  spellId: SpellId;
  spellData: ISpellData;

  private _byHitCount: {[count: number]: SpellStats} = {};

  constructor(spellId: SpellId) {
    super([], true);
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
  }

  addCast(cast: CastDetails) {
    super.addCast(cast);

    if (this.spellData.statsByTick) {
      if (!this._byHitCount.hasOwnProperty(cast.hits)) {
        this._byHitCount[cast.hits] = new SpellStats([], true);
      }
      this._byHitCount[cast.hits].addCast(cast);
    }
  }

  /**
   * Stats by Hit Count (currently MF only)
   * cf. SpellData
   */

  hasStatsByHitCount() {
    return this.spellData.statsByTick;
  }

  statsByHitCount(count: number) {
    return this._byHitCount[count];
  }
}
