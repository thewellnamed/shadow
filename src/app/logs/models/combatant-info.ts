import { IActorItem, IActorStats, ICombatantInfo } from 'src/app/logs/interfaces';
import { ISpellData } from 'src/app/logs/models/spell-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

export class CombatantInfo {
  stats: IActorStats;
  items: IActorItem[];
  bonuses: IBonusStats = {};

  constructor(info: ICombatantInfo) {
    this.stats = info.stats;
    this.items = info.gear;
    this.bonuses = this.evaluateBonuses();
  }

  private evaluateBonuses() {
    // for now T6 2pc is the only bonus, so not going to over-engineer this too much...
    const t6itemIds = [
      31064, // hood of absolution
      31070, // shoulderpads of absolution
      31065, // shroud of absolution
      31067, // leggings of absolution
      31061 // handguards of absolution
    ];

    let count = 0;
    for (const item of this.items) {
      if (t6itemIds.includes(item.id)) {
        count++;
      }
    }

    if (count >= 2) {
      // 2pc T6 gives an extra tick to SW:P
      return {
        [SpellId.PAIN]: {
          maxDamageInstances: 9,
          maxDuration: 27
        }
      };
    }

    return {};
  }
}

export interface IBonusStats {
  [spellId: number]: Partial<ISpellData>;
}
