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
  targetId: number|undefined;
  hitCount: number|undefined;

  private _byHitCount: {[count: number]: SpellStats} = {};

  constructor(spellId: SpellId, hitCount?: number, targetId?: number) {
    super([], targetId === undefined);
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
    this.targetId = targetId;
    this.hitCount = hitCount;
  }

  addCast(cast: CastDetails, targetId?: number) {
    super.addCast(cast, targetId);

    if (this.hitCount === undefined && this.spellData.statsByTick) {
      if (!this._byHitCount.hasOwnProperty(cast.hits)) {
        this._byHitCount[cast.hits] = new SpellSummary(this.spellId, cast.hits, targetId);
      }
      this._byHitCount[cast.hits].addCast(cast, targetId);
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

  protected createTargetStats(targetId: number): SpellSummary {
    return new SpellSummary(this.spellId, this.hitCount, targetId);
  }
}
