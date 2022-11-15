import { ICombatantAura, ICombatantData, ICombatantItem } from 'src/app/logs/interfaces';
import { ISpellData } from 'src/app/logs/models/spell-data';
import { ActorStats } from 'src/app/logs/models/actor-stats';
import { AuraId } from 'src/app/logs/models/aura-id.enum';

export class CombatantInfo {
  stats: ActorStats;
  gear: ICombatantItem[];
  auras: ICombatantAura[];
  bonuses: IBonusStats = {};
  faction: CombatantFaction;
  initFromLog = false;

  constructor(info?: ICombatantData) {
    this.gear = info?.gear || [];
    this.auras = info?.auras || [];
    this.stats = new ActorStats(info);

    this.bonuses = this.evaluateBonuses();
    this.faction = info?.faction || CombatantFaction.HORDE;
    this.initFromLog = typeof info !== 'undefined';
  }

  haveAura(id: AuraId) {
    return this.auras.some((aura) => aura.ability === id);
  }

  // todo: re-design for wrath set bonuses.
  private evaluateBonuses() {
    return {};
  }
}

export enum CombatantFaction {
  HORDE,
  ALLIANCE
}

export interface IBonusStats {
  [spellId: number]: Partial<ISpellData>;
}
