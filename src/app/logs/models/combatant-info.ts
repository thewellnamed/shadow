import { ICombatantAura, ICombatantData, ICombatantItem } from 'src/app/logs/interfaces';
import { ISpellData } from 'src/app/logs/models/spell-data';
import { ActorStats } from 'src/app/logs/models/actor-stats';

export class CombatantInfo {
  stats: ActorStats;
  gear: ICombatantItem[];
  auras: ICombatantAura[];
  bonuses: IBonusStats = {};

  constructor(info?: ICombatantData) {
    this.gear = info?.gear || [];
    this.auras = info?.auras || [];
    this.stats = new ActorStats(info);

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
