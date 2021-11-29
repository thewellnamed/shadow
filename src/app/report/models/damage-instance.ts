import { IDamageData } from 'src/app/logs/logs.service';
import { HitType } from 'src/app/logs/models/hit-type';

export class DamageInstance {
  timestamp: number;
  hitType: HitType;
  amount: number;
  absorbed: number;
  resisted: number;

  constructor(data: IDamageData) {
    this.timestamp = data.timestamp;
    this.hitType = data.hitType;
    this.amount = data.amount;
    this.absorbed = data.absorbed || 0;
    this.resisted = data.resisted || 0;
  }

  get partial() {
    return this.absorbed > 0 || this.resisted > 0;
  }

  get partialSummary() {
    if (!this.partial) {
      return '';
    }

    let out = '';
    if (this.absorbed > 0) {
      out += `A: ${this.absorbed}`;
    }

    if (this.resisted > 0) {
      if (out.length > 0) out += ', ';
      out += `R: ${this.resisted}`;
    }
    return out;
  }
}
