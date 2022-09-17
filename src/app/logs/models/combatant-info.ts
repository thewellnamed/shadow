import { ICombatantAura, ICombatantData, ICombatantItem } from 'src/app/logs/interfaces';
import { ISpellData } from 'src/app/logs/models/spell-data';
import { ActorStats } from 'src/app/logs/models/actor-stats';
import { BuffId } from 'src/app/logs/models/buff-id.enum';

export class CombatantInfo {
  stats: ActorStats;
  gear: ICombatantItem[];
  auras: ICombatantAura[];
  bonuses: IBonusStats = {};
  initFromLog = false;

  constructor(info?: ICombatantData) {
    this.gear = info?.gear || [];
    this.auras = info?.auras || [];
    this.stats = new ActorStats(info);

    this.bonuses = this.evaluateBonuses();
    this.initFromLog = typeof info !== 'undefined';
  }

  haveAura(id: BuffId) {
    return this.auras.some((aura) => aura.ability === id);
  }

  // todo: re-design for wrath set bonuses.
  private evaluateBonuses() {
    return {};
  }
}

export interface IBonusStats {
  [spellId: number]: Partial<ISpellData>;
}
