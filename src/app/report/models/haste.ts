import { IActorStats } from 'src/app/logs/interfaces';
import { IBuffEvent } from 'src/app/logs/models/buff-data';

export class HasteUtils {

  // Get haste values, combining base rating from gear (summary data)
  // and values from a set of current buffs
  public static calc(playerStats: IActorStats, buffs: IBuffEvent[] = []) {
    const stats: IHasteStats = {
      // combine haste rating from buffs with haste rating from gear, additively
      hasteRating: buffs.reduce((hasteRating, buff) => {
        hasteRating += buff.data.hasteRating;
        return hasteRating;
      }, playerStats.Haste?.min || 0),

      // combine haste percent buff effects multiplicatively
      hastePercent: buffs.reduce((haste, buff) => {
        haste *= (1 + buff.data.haste);
        return haste;
      }, 1),

      totalHaste: 0,
      gcd: 0
    };

    stats.totalHaste = (stats.hastePercent * (1 + (stats.hasteRating / 15.77 / 100)));
    stats.gcd = Math.max(1.5 / stats.totalHaste, 1.0);
    return stats;
  }
}

export interface IHasteStats {
  hasteRating: number,
  hastePercent: number,
  totalHaste: number,
  gcd: number
}
