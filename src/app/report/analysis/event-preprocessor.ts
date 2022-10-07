import { Actor } from 'src/app/logs/models/actor';
import { IEncounterEvents } from 'src/app/logs/logs.service';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { mapSpellId } from 'src/app/logs/models/spell-id.enum';
import { DamageType, Spell } from 'src/app/logs/models/spell-data';
import { IBuffData, IDamageData } from 'src/app/logs/interfaces';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { matchTarget } from 'src/app/report/analysis/utils';
import { Buff } from 'src/app/logs/models/buff-data';
import { BuffId } from 'src/app/logs/models/buff-id.enum';

import * as wcl from 'src/app/logs/interfaces';

export class EventPreprocessor {
  private analysis: PlayerAnalysis;
  private inputEvents: IEncounterEvents;
  private actor: Actor;

  private casts: wcl.ICastData[];
  private damage: wcl.IDamageData[];
  private buffs: wcl.IBuffData[];

  constructor(analysis: PlayerAnalysis, events: IEncounterEvents) {
    this.analysis = analysis;
    this.actor = analysis.actor;
    this.inputEvents = events;
  }

  run(): IEncounterEvents {
    // prune extraneous shadowfiend damage events from other priests
    // todo -- would probably be nicer to find a way to avoid querying these...
    this.damage = this.inputEvents.damage
      .filter((e) => e.sourceID === this.actor.id || e.sourceID === this.actor.shadowFiendId)
      .map((e) => Object.assign({}, e, { read: false }));

    // infer missing casts
    this.casts = this.inferMissingCasts();

    // infer missing buffs
    this.buffs = this.inferMissingBuffs();

    return {
      buffs: this.buffs,
      casts: this.casts,
      damage: this.damage,
      deaths: this.inputEvents.deaths
    };
  }

  // sometimes casts that start before combat begins for the logger are omitted,
  // but the damage is recorded. Check the first few damage spells and create casts
  // if one is not found.
  private inferMissingCasts() {
    const casts = this.inputEvents.casts.slice();
    let instancesToCheck = this.damage.length >= 3 ? 2 : this.damage.length - 1;
    const spellIdsInferred: number[] = [];

    // find first damage cast so we can borrow its spellpower if we find a missing cast
    const firstDamageCast = casts.find((c) =>
      c.type === 'cast' && Spell.dataBySpellId[mapSpellId(c.ability.guid)].damageType !== DamageType.NONE
    );

    for (let i = instancesToCheck; i >= 0; i--) {
      const instance = this.damage[i];

      if (instance.ability.guid < 0) {
        instancesToCheck++;
        continue;
      }

      let castIndex = 0, match = false,
        nextCast = casts[castIndex],
        castSpell = Spell.baseData(mapSpellId(nextCast.ability.guid));

      do {
        const damageSpell = Spell.fromDamageId(instance.ability.guid);
        if (damageSpell?.mainId === castSpell.mainId && matchTarget(this.analysis, nextCast, instance, true)) {
          match = true;
          break;
        }
        nextCast = casts[++castIndex];
        castSpell = Spell.baseData(mapSpellId(nextCast.ability.guid));
      } while (nextCast && nextCast.timestamp < instance.timestamp + EventAnalyzer.EVENT_LEEWAY);

      if (!match && !spellIdsInferred.includes(instance.ability.guid)) {
        casts.unshift({
          type: 'cast',
          ability: instance.ability,
          timestamp: this.inferCastTimestamp(instance),
          sourceID: instance.sourceID,
          targetID: instance.targetID,
          targetInstance: instance.targetInstance,
          hitPoints: 100,
          maxHitPoints: 100,
          read: false,
          spellPower: firstDamageCast?.spellPower || 0 // we really have no idea, but it should be close to this
        });
        spellIdsInferred.push(instance.ability.guid);
      }
    }

    return casts;
  }

  private inferCastTimestamp(damage: IDamageData) {
    const spellData = Spell.baseData(mapSpellId(damage.ability.guid));

    if ([DamageType.DOT, DamageType.CHANNEL].includes(spellData?.damageType)) {
      // First find the earliest tick we want to associate to our inferred cast,
      // then infer the cast time based on how frequently the spell ticks
      const timeToTick = (spellData.maxDuration / spellData.maxDamageInstances) * 1000,
        earliestPossible = damage.timestamp - (spellData.maxDuration * 1000);

      const earliestInstance = this.damage.find((d) =>
        d.ability.guid === damage.ability.guid &&
        d.timestamp >= earliestPossible - EventAnalyzer.EVENT_LEEWAY &&
        d.targetID === damage.targetID &&
        d.targetInstance === damage.targetInstance
      ) as IDamageData;

      return Math.max(earliestInstance.timestamp - timeToTick, this.analysis.encounter.start);
    }

    return damage.timestamp;
  }

  private inferMissingBuffs() {
    // create fake buff events for tracked auras present at encounter start.
    const buffs: IBuffData[] = this.analysis.actorInfo.auras
      .filter((aura) => Buff.data.hasOwnProperty(aura.ability))
      .map((aura) => ({
        type: 'applybuff',
        timestamp: this.analysis.encounter.start - 1,
        sourceID: aura.source,
        targetID: this.analysis.actor.id,
        targetInstance: 0,
        ability: { guid: aura.ability, name: aura.name },
        read: false
      }));

    // for auras discovered from the summary, bonus stats are applied to the ActorStats
    // but we'll process those through our normal buff processing loop, so we want to remove them
    for (const event of buffs) {
      this.updateActorStats(event);
    }

    // append in-combat events...
    buffs.push(... this.inputEvents.buffs.slice());

    const active: {[id: number]: IBuffData} = {};
    const missing: IBuffData[] = [];

    // find buffs applied before combat (remove event, but no apply event)
    // and add them at the beginning of the fight
    for (const event of buffs) {
      switch (event.type) {
        case 'applybuff':
        case 'refreshbuff':
          active[event.ability.guid] = event;
          continue;

        case 'removebuff':
          if (active.hasOwnProperty(event.ability.guid)) {
            delete active[event.ability.guid];
          } else {
            missing.push(event);
          }
          continue;
      }
    }

    for (const event of missing) {
      buffs.unshift({
        type: 'applybuff',
        timestamp: this.analysis.encounter.start - 1,
        targetID: event.targetID,
        targetInstance: event.targetInstance,
        ability: event.ability,
        read: false
      });

      // missing buffs might also be reflected in ActorStats, so update them.
      this.updateActorStats(event);
    }

    // if wrath of air is enabled, and a shaman is found in the raid, then apply wrath of air buff
    if (this.analysis.applyWrathOfAir) {
      buffs.unshift({
        type: 'applybuff',
        timestamp: this.analysis.encounter.start,
        targetID: this.analysis.actor.id,
        targetInstance: 0,
        ability: { name: 'Wrath of Air', guid: BuffId.WRATH_OF_AIR },
        read: false
      })
    }

    return buffs;
  }

  private updateActorStats(event: IBuffData) {
    const baseRating = this.analysis.actorInfo?.stats?.hasteRating || 0;
    const buffData = Buff.data[event.ability.guid];

    if (buffData.hasteRating > 0 && baseRating > buffData.hasteRating) {
      this.analysis.actorInfo!.stats!.hasteRating -= buffData.hasteRating;
    }
  }
}
