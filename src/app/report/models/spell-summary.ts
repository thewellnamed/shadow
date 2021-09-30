import { CastDetails } from 'src/app/report/models/cast-details';
import { SpellId, SpellData, ISpellData } from 'src/app/logs/models/spell-id.enum';

export class SpellSummary {
  spellId: SpellId;
  spellData: ISpellData;
  casts: CastDetails[] = []

  private _totalDamage = 0;
  private _totalHits = 0;
  private _avgHits = 0;
  private _successfulCasts: number;
  private _castsByHitCount: { [i: number]: number };
  private recalculate = false;

  constructor(spellId: SpellId) {
    this.spellId = spellId;
    this.spellData = SpellData[spellId];
  }

  addCast(details: CastDetails) {
    this.casts.push(details);
    this.recalculate = true;
  }

  get count() {
    return this.casts.length;
  }

  get totalDamage() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalDamage;
  }

  get successfulCasts() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._successfulCasts;
  }

  get totalHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._totalHits;
  }

  get avgHits() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._avgHits;
  }

  get castsByHitCount() {
    if (this.recalculate) {
      this.calculate();
    }

    return this._castsByHitCount;
  }

  private calculate() {
    if (this.spellData.damage) {
      this._totalDamage = this.casts.reduce((sum, next) => {
        sum += next.totalDamage;
        return sum;
      }, 0);

      this._successfulCasts = this.casts.filter((c) => c.totalDamage > 0).length;

      this._totalHits = this.casts
        .filter((c) => c.totalDamage > 0)
        .reduce((sum, next) => {
          sum += (this.spellData.maxDamageInstances > 1 ? next.ticks : 1);
          return sum;
        }, 0);

      if (this.spellData.maxDamageInstances > 1) {
        this._avgHits = this._totalHits / this._successfulCasts;

        this._castsByHitCount = this.casts
          .filter((c) => c.totalDamage > 0)
          .reduce((cbt, next) => {
            if (cbt.hasOwnProperty(next.ticks)) {
              cbt[next.ticks]++;
            } else {
              cbt[next.ticks] = 1;
            }
            return cbt;
          }, {} as {[n: number]: number});
      } else {
        this._avgHits = 1;
        this._castsByHitCount = { [1]: this._successfulCasts };
      }
    }

    this.recalculate = false;
  }
}
