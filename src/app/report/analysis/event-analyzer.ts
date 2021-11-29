import { CastsSummary } from 'src/app/report/models/casts-summary';
import { CastDetails } from 'src/app/report/models/cast-details';
import { ICastData, IDamageData } from 'src/app/logs/logs.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellData } from 'src/app/logs/models/spell-data';
import { DamageInstance } from 'src/app/report/models/damage-instance';

export class EventAnalyzer {
  private static EVENT_LEEWAY = 50 // ms. allow damage to occur just slightly later than "should" be possible given
                                   // strict debuff times. Blah blah server doesn't keep time exactly.

  /**
   * Generate basic data on casts
   * @param {ICastData[]} castData
   * @param {IDamageData[]} damageData
   * @returns {CastsSummary}
   */
  public static createCasts(castData: ICastData[], damageData: IDamageData[]): CastDetails[] {
    let currentCast: ICastData, startingCast: ICastData|null = null;
    let nextCast: ICastData|null, nextDamage: IDamageData|null;
    const casts: CastDetails[] = [];

    const damageBySpell: {[spellId: number]: IDamageData[]} = {
      [SpellId.DEATH]: [],
      [SpellId.PAIN]: [],
      [SpellId.MIND_BLAST]: [],
      [SpellId.MIND_FLAY]: [],
      [SpellId.VAMPIRIC_TOUCH]: []
    };

    // partition damage data by spell ID to make it easier
    // to associate instances of damage with casts.
    for (const event of damageData) {
      if (damageBySpell.hasOwnProperty(event.ability.guid)) {
        damageBySpell[event.ability.guid].push(event);
      }
    }

    while (castData.length > 0) {
      currentCast = castData.shift() as ICastData;

      if (currentCast.type === 'begincast') {
        startingCast = currentCast;
        continue;
      }

      // if the completed cast isn't the one we started, remove starting info
      // note that starting cast events don't have the target info but we shouldn't need to match it
      // because if we switch targets we'll have a new begincast event anyway
      if (startingCast && currentCast.ability.guid !== startingCast.ability.guid) {
        startingCast = null;
      }

      const spellId = currentCast.ability.guid;
      const details = new CastDetails({
        ability: currentCast.ability,
        targetId: currentCast.targetID,
        targetInstance: currentCast.targetInstance,
        castStart: startingCast?.timestamp || currentCast.timestamp,
        castEnd: currentCast.timestamp,
        spellPower: currentCast.spellPower
      });
      casts.push(details);

      if (damageBySpell.hasOwnProperty(spellId)) {
        const damageEvents = damageBySpell[spellId];
        const spellData = SpellData[spellId];

        // for dots, we need to associate damage ticks with the appropriate cast
        // we know how far into the future this cast could tick, but we need to
        // look for a future cast on the same target, because the current cast can only
        // be responsible for ticks up until the next cast on a given target
        if (spellData.maxDamageInstances > 1) {
          let i = 0;
          let maxDamageTimestamp = currentCast.timestamp + (spellData.maxDuration * 1000);
          let instances: DamageInstance[] = [];

          do {
            nextCast = castData.length > i ? castData[i] : null;
            if (nextCast === null || this.castIsReplacement(details, nextCast)) {
              maxDamageTimestamp = nextCast?.timestamp || maxDamageTimestamp;
              break;
            }
            i++;
          } while (nextCast.timestamp <= maxDamageTimestamp + this.EVENT_LEEWAY);

          // Process damage instances for this spell within the window
          nextDamage = damageEvents[0];
          let count = 0;
          i = 0;
          while (nextDamage && count < spellData.maxDamageInstances) {
            if (this.matchDamage(details, nextDamage, maxDamageTimestamp)) {
              instances.push(new DamageInstance(nextDamage));
              nextDamage.read = true;
              count++;
            }

            nextDamage = damageEvents[++i];
          }
          details.setInstances(instances);
        } else {
          // find the next instance of damage for this spell for this target.
          const damage = damageEvents.find((d) => this.matchDamage(details, d, details.castEnd));

          if (damage) {
            details.setInstances([new DamageInstance((damage))]);
            damage.read = true;
          }
        }

        // prune read events
        // this is probably unnecessary given the small size of these arrays, but whatever.
        nextDamage = damageEvents[0];
        while (nextDamage && nextDamage.read) {
          damageEvents.shift();
          nextDamage = damageEvents[0];
        }
      }
    }

    return casts;
  }

  // next replaces the current cast if ALL of these conditions are true
  // -- the cast completed (type is 'cast', not 'begincast')
  // -- on the same kind of mob (targetID)
  // -- on the same instance of that mob (e.g. in WCL "Spellbinder 3" is a different instance from "Spellbinder 2"
  private static castIsReplacement(cast: CastDetails, next: ICastData) {
    return next.type === 'cast' &&
      next.ability.guid === cast.spellId &&
      next.targetID === cast.targetId &&
      next.targetInstance === cast.targetInstance;
  }

  private static matchDamage(cast: CastDetails, next: IDamageData, maxTimestamp: number) {
    // must match target and be unread
    if (next.read || next.targetID !== cast.targetId || next.targetInstance !== cast.targetInstance) {
      return false;
    }

    // must take place in the proper window
    if (next.timestamp < (cast.castEnd - this.EVENT_LEEWAY) || next.timestamp > (maxTimestamp + this.EVENT_LEEWAY)) {
      return false;
    }

    return true;
  }
}
