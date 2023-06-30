import { ICombatantAura, ICombatantData, ICombatantItem } from 'src/app/logs/interfaces';
import { ISpellData } from 'src/app/logs/models/spell-data';
import { ActorStats } from 'src/app/logs/models/actor-stats';
import { AuraId } from 'src/app/logs/models/aura-id.enum';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

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

  private evaluateBonuses() {
    let bonuses: IBonusStats = {};

    // T9
    const t9ItemIds = [
      48085, 48088, 48078, 48095, 48073, 48755, 48098, 48760,   // head
      48757, 48076, 48081, 48082, 48762, 48101, 48091, 48092,   // shoulders
      48759, 48075, 48080, 48083, 48764, 48100, 48090, 48093,   // chest
      48758, 48074, 48079, 48084, 48763, 48099, 48089, 48094,   // legs
      48756, 48072, 48077, 48086, 78761, 48097, 48087, 48096,   // hands
    ];
    const t9Pieces = this.gear.reduce((c, i) => c + (t9ItemIds.includes(i.id) ? 1 : 0), 0);
    if (t9Pieces >= 2) {
      bonuses = Object.assign(bonuses, this.T9Bonus2pc);
    }

    return bonuses;
  }

  public get T9Bonus2pc() {
    // 2pc T9 gives extra ticks to VT
    return {
      [SpellId.VAMPIRIC_TOUCH]: {
        maxDamageInstances: 7,
        maxTicks: 7,
        maxDuration: 21,
      }
    };
  }
}

export enum CombatantFaction {
  HORDE,
  ALLIANCE
}

export interface IBonusStats {
  [spellId: number]: Partial<ISpellData>;
}
