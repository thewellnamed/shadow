import { IDamageData } from 'src/app/logs/interfaces';
import { HitType } from 'src/app/logs/models/hit-type.enum';

export class DamageInstance {
  timestamp: number;
  targetId: number;
  targetInstance: number;
  hitType: HitType;
  amount: number;
  absorbed: number;
  resisted: number;

  constructor(data: IDamageData) {
    this.timestamp = data.timestamp;
    this.targetId = data.targetID;
    this.targetInstance = data.targetInstance;
    this.hitType = data.hitType;
    this.amount = data.amount;
    this.absorbed = data.absorbed || 0;
    this.resisted = data.resisted || 0;
  }

  get totalDamage() {
    return this.amount + this.absorbed;
  }

  get partial() {
    return this.absorbed > 0 || this.resisted > 0;
  }

  get isResist() {
    return this.hitType === HitType.RESIST;
  }

  get isImmune() {
    return this.hitType === HitType.IMMUNE;
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
