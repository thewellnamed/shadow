import { IActorStats } from 'src/app/logs/interfaces';
import { IBuffEvent } from 'src/app/logs/models/buff-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellData } from 'src/app/logs/models/spell-data';

export class HasteUtils {
  public static RATING_FACTOR = 15.77;

  // Get haste values, combining base rating from gear (summary data)
  // and values from a set of current buffs
  public static calc(playerStats: Partial<IActorStats>, buffs: IBuffEvent[] = []) {
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

    stats.totalHaste = (stats.hastePercent * (1 + (stats.hasteRating / HasteUtils.RATING_FACTOR / 100)));
    stats.gcd = Math.max(1.5 / stats.totalHaste, 1.0);
    return stats;
  }

  // get expected cast time for a given spell, with a given amount of total haste
  public static castTime(spellId: SpellId, haste: number) {
    return SpellData[spellId].baseCastTime / (1 + haste);
  }

  public static inferRating(hastePercent: number, baseCastTime: number, actualCastTime: number) {
    // solve for the percent of haste coming from rating
    const hasteFromRating = baseCastTime / (hastePercent * actualCastTime);

    // if the answer don't make no sense it's probably because of variance in server processing times
    if (hasteFromRating < 0) {
      return 0;
    }

    // convert from percent to rating
    return (hasteFromRating - 1) * 100 * HasteUtils.RATING_FACTOR;
  }
}

export interface IHasteStats {
  hasteRating: number,
  hastePercent: number,
  totalHaste: number,
  gcd: number
}
