import { ActorStats } from 'src/app/logs/models/actor-stats';
import { IBuffEvent } from 'src/app/logs/models/buff-data';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, ISpellData, Spell } from 'src/app/logs/models/spell-data';
import { CastDetails } from 'src/app/report/models/cast-details';

export class HasteUtils {
  public static RATING_FACTOR = 32.79; // level 80

  // Get haste values, combining base rating from gear (summary data)
  // and values from a set of current buffs
  public static calc(playerStats: ActorStats, buffs: IBuffEvent[] = []) {
    const stats: IHasteStats = {
      // combine haste rating from buffs with haste rating from gear, additively
      hasteRating: buffs.reduce((hasteRating, buff) => {
        hasteRating += buff.data.hasteRating;
        return hasteRating;
      }, playerStats.hasteRating || 0),

      // combine haste percent buff effects multiplicatively
      hastePercent: buffs.reduce((haste, buff) => {
        if (HasteUtils.includeBuff(buff, buffs)) {
          haste *= (1 + buff.data.haste);
        }
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
    return HasteUtils.apply(Spell.dataBySpellId[spellId].baseCastTime, haste);
  }

  public static apply(baseTime: number, haste: number) {
    return baseTime / (1 + haste);
  }

  public static duration(spellId: SpellId, haste: number) {
    return Spell.dataBySpellId[spellId].maxDuration / (1 + haste);
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

  // handle buffs that don't stack.
  // Will return true if this buff is the largest of the set of non-stacking, else false
  public static includeBuff(buff: IBuffEvent, buffs: IBuffEvent[]) {
    if (buff.data.doesNotStackWith.length === 0) {
      return true;
    }

    for (const otherId of buff.data.doesNotStackWith) {
      const otherBuff = buffs.find((b) => b.id === otherId);
      if (otherBuff && HasteUtils.yieldPriority(buff, otherBuff, buffs)) {
        return false;
      }
    }

    return true;
  }

  // Can haste percent be inferred from log-data about this cast?
  // Requires either a spell with a cast time, or a spell that benefits from haste and has at least one tick.
  public static canInferHaste(cast: CastDetails, spellData: ISpellData) {
    if (cast.castTimeMs > 500) {
      return true;
    }

    if (spellData.damageType === DamageType.CHANNEL && cast.instances.length > 0) {
      return true;
    }

    if (spellData.damageType === DamageType.DOT && spellData.dotHaste && cast.instances.length > 1) {
      return true;
    }

    return false;
  }

  // Determine difference between actual haste of cast from log data and the expected haste
  // from buffs found on player at cast time.
  public static getHasteError(cast: CastDetails, spellData: ISpellData): number {
    let actualDelta: number, baseDelta: number;

    switch (spellData.damageType) {
      case DamageType.CHANNEL:
        actualDelta = cast.instances[0].timestamp - cast.castEnd;
        baseDelta = spellData.maxDuration / spellData.maxTicks;
        break;

      // @ts-ignore allow fall-through
      case DamageType.DOT:
        // not using castEnd just to avoid dealing with the instant damage component of DP
        if (cast.instances.length > 1) {
          actualDelta = cast.instances[cast.instances.length - 1].timestamp -
            cast.instances[cast.instances.length - 2].timestamp;
          baseDelta = spellData.baseTickTime;
          break;
        }
        // else intentionally fall through

      default:
        actualDelta = cast.castTimeMs;
        baseDelta = spellData.baseCastTime;
        break;
    }

    const expectedDelta = HasteUtils.apply(baseDelta * 1000, cast.haste);
    return (expectedDelta - actualDelta) / expectedDelta;
  }

  // `buff` should yield priority to `other` if other has a larger effect or is first (in event of tie)
  private static yieldPriority(buff: IBuffEvent, other: IBuffEvent, buffs: IBuffEvent[]): boolean {
    if (other.data.haste > buff.data.haste) {
      return true;
    }

    if (other.data.haste === buff.data.haste) {
      return buffs.findIndex((b) => b.id === other.id) < buffs.findIndex((b) => b.id === buff.id);
    }

    return false;
  }
}

export interface IHasteStats {
  hasteRating: number,
  hastePercent: number,
  totalHaste: number,
  gcd: number
}
