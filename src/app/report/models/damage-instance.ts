import { IDamageData } from 'src/app/logs/logs.service';

export class DamageInstance {
  timestamp: number;
  amount: number;

  constructor(data: IDamageData) {
    this.timestamp = data.timestamp;
    this.amount = data.amount;
  }
}
