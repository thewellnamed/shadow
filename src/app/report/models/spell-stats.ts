import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { ISpellData, SpellData } from 'src/app/logs/models/spell-data';
import { CastStats } from 'src/app/report/models/cast-stats';

/**
 * Summarize performance for a single spell over an encounter
 */
export class SpellStats extends CastStats {
  spellId: SpellId;
  spellData: ISpellData;
  hitCount: number|undefined;

  private _byHitCount: {[count: number]: CastStats} = {};

  constructor(spellId: SpellId, targetId?: number, hitCount?: number) {
    super(targetId);

    this.spellId = spellId;
    this.spellData = SpellData[spellId];
    this.targetId = targetId;
    this.hitCount = hitCount;
  }

  addCast(cast: CastDetails) {
    super.addCast(cast);

    if (this.hitCount === undefined && this.spellData.statsByTick) {
      if (!this._byHitCount.hasOwnProperty(cast.hits)) {
        this._byHitCount[cast.hits] = new SpellStats(this.spellId, this.targetId, cast.hits);
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

  protected createTargetStats(targetId: number): SpellStats {
    return new SpellStats(this.spellId, targetId, this.hitCount);
  }
}
