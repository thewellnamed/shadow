import { IActorItem, IActorStats, ICombatantInfo } from 'src/app/logs/interfaces';
import { ISpellData } from 'src/app/logs/models/spell-data';

export class CombatantInfo {
  stats: IActorStats;
  items: IActorItem[];
  bonuses: IBonusStats = {};

  constructor(info: ICombatantInfo) {
    this.stats = info.stats;
    this.items = info.gear;
    this.bonuses = this.evaluateBonuses();
  }

  // todo: re-design for wrath set bonuses.
  private evaluateBonuses() {
    return {};
  }
}

export interface IBonusStats {
  [spellId: number]: Partial<ISpellData>;
}
