import { CastDetails } from 'src/app/report/cast-details';

export class CastSummary {
  casts: CastDetails[] = []

  private _totalDamage: number;
  private _totalHits: number;
  private recalculate = false;

  constructor() {}

  addCast(details: CastDetails) {
    this.casts.push(details);
    this.recalculate = true;
  }

  get count() {
    return this.casts.length;
  }

  get totalDamage() {
    if (this.recalculate) {
      this.analyze();
    }

    return this._totalDamage;
  }

  get totalHits() {
    if (this.recalculate) {
      this.analyze();
    }

    return this._totalHits;
  }

  private analyze() {
    this._totalDamage = this.casts.reduce((sum, next) => {
        sum += next.totalDamage;
        return sum;
      }, 0);

    this._totalHits = this.casts
      .filter((c) => c.totalDamage > 0)
      .reduce((sum, next) => {
        sum += next.ticks;
        return sum;
      }, 0);

    this.recalculate = false;
  }
}
