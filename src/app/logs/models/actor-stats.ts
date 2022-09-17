import { ICombatantData } from 'src/app/logs/interfaces';

export class ActorStats {
  intellect: number;
  spirit: number;
  stamina: number;
  hasteRating: number;
  critRating: number;
  hitRating: number;

  constructor(event?: ICombatantData) {
    if (event) {
      this.intellect = event.intellect;
      this.spirit = event.spirit;
      this.stamina = event.stamina;
      this.hasteRating = event.hasteSpell;
      this.critRating = event.critSpell;
      this.hitRating = event.hitSpell;
    }
  }

  public static inferred(hasteRating: number) {
    const stats = new ActorStats();
    stats.hasteRating = hasteRating;
    return stats;
  }
}
