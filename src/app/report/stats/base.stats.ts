import { SpellStats } from 'src/app/report/models/spell-stats';

export abstract class BaseStats {
  public abstract report(stats: SpellStats): IStatDetails[];
}

export interface IStatDetails {
  label: string;
  highlight: string;
  value: string;
}
