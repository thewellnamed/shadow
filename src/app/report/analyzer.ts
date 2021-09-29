import { CastDetails } from 'src/app/report/cast-details';
import { CastSummary } from 'src/app/report/cast-summary';
import { ICastData, IDamageData } from 'src/app/logs/logs.service';
import { DamageSpells, ISpellData, SpellData, SpellId } from 'src/app/logs/spell-id.enum';

export class Analyzer {
  private static EVENT_LEEWAY = 50 // ms. allow damage to occur just slightly later than "should" be possible given
                                   // strict debuff times. Blah blah server doesn't keep time exactly.

  /**
   * Generate basic data on casts
   * @param {ICastData[]} castData
   * @param {IDamageData[]} damageData
   * @returns {CastDetails[]}
   */
  public static createCasts(castData: ICastData[], damageData: IDamageData[]): Casts {
    let currentCast: ICastData, startingCast: ICastData|null = null;
    let nextCast: ICastData|null, nextDamage: IDamageData|null;

    const castsBySpell: {[spellId: number]: CastSummary} =
      DamageSpells.reduce((cbs, spellId) => {
        cbs[spellId] = new CastSummary(spellId);
        return cbs;
      }, {} as {[spellId: number]: CastSummary});

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
      if (startingCast && currentCast.ability.guid != startingCast.ability.guid) {
        startingCast = null;
      }

      const spellId = currentCast.ability.guid;
      const damageEvents = damageBySpell[spellId];

      if (damageBySpell.hasOwnProperty(spellId)) {
        const spellData = SpellData[spellId] as ISpellData;

        const details = new CastDetails({
          ability: currentCast.ability,
          targetId: currentCast.targetID,
          targetInstance: currentCast.targetInstance,
          castStart: startingCast?.timestamp || currentCast.timestamp,
          castEnd: currentCast.timestamp
        });

        // for dots, we need to associate damage ticks with the appropriate cast
        // we know how far into the future this cast could tick, but we need to
        // look for a future cast on the same target, because the current cast can only
        // be responsible for ticks up until the next cast on a given target
        if (spellData.maxInstances > 1) {
          let i = 0;
          let maxDamageTimestamp = currentCast.timestamp + (spellData.maxDuration * 1000) + this.EVENT_LEEWAY;

          do {
            nextCast = castData.length > i ? castData[i] : null;
            if (nextCast === null || this.castIsReplacement(details, nextCast)) {
              maxDamageTimestamp = (nextCast && nextCast?.timestamp + this.EVENT_LEEWAY) || maxDamageTimestamp;
              break;
            }
            i++;
          } while (nextCast.timestamp <= maxDamageTimestamp);

          // Process damage instances for this spell within the window
          nextDamage = damageEvents[0];
          let totalDamage = 0, instances = 0;
          i = 0;
          while (nextDamage && nextDamage.timestamp <= maxDamageTimestamp && instances < spellData.maxInstances) {
            if (!nextDamage.read && this.targetMatch(details, nextDamage)) {
              totalDamage += nextDamage.amount;
              nextDamage.read = true;
              ++instances;
            }
            nextDamage = damageEvents[++i];
          }

          details.totalDamage = totalDamage;
          details.ticks = instances;
        } else {
          // find the next instance of damage for this spell for this target.
          const damage = damageEvents.find((d) => !d.read && this.targetMatch(details, d));

          if (damage) {
            details.totalDamage = damage.amount;
            damage.read = true;
          } else {
            details.totalDamage = 0;
          }
        }

        castsBySpell[spellId].addCast(details);

        // prune read events
        // this is probably unnecessary given the small size of these arrays, but whatever.
        nextDamage = damageEvents[0];
        while (nextDamage && nextDamage.read) {
          damageEvents.shift();
          nextDamage = damageEvents[0];
        }
      }
    }

    return castsBySpell;
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

  private static targetMatch(cast: CastDetails, next: IDamageData) {
    return next.targetID === cast.targetId && next.targetInstance === cast.targetInstance;
  }
}

export type Casts = {[spellId: number]: CastSummary };
