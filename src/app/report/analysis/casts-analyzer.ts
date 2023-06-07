import { CastDetails } from 'src/app/report/models/cast-details';
import { Report } from 'src/app/report/models/report';
import { DamageType, ISpellData, Spell } from 'src/app/logs/models/spell-data';
import { HitType } from 'src/app/logs/models/hit-type.enum';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { HasteUtils } from 'src/app/report/models/haste';
import { Buff, IBuffDetails } from 'src/app/logs/models/buff-data';

export class CastsAnalyzer {
  private static MAX_LATENCY = 1000; // ignore latency for gaps large enough to represent intentional movement
  private static MAX_ACTIVE_DOWNTIME = 10000; // ignore cooldown/dot downtime for gaps over 10s
  private static EARLY_CLIP_THRESHOLD = 0.67; // clipped MF 67% of the way to the next tick
  private static EARLY_CLIP_LEEWAY = 50; // if a tick is missing and the next cast is late enough the tick
                                         // *should* have occurred, but it didn't, then count it as an early clip
                                         // if the next cast is within this threshold after the expected tick
                                         // trying to account for variance in server processing times?

  private analysis: PlayerAnalysis;
  private casts: CastDetails[];
  private inferred: { [auraId: number]: IBuffDetails };

  constructor(analysis: PlayerAnalysis, casts: CastDetails[]) {
    this.analysis = analysis;
    this.casts = casts;
  }

  public run(): Report {
    const inferrableBuffs = Buff.inferrable(this.analysis),
      doInference = inferrableBuffs.length > 0;

    this.inferred = {};
    for (let i = 0; i < this.casts.length; i++) {
      const current = this.casts[i],
        spellData = Spell.get(current.spellId, this.analysis, current.haste);
      let prevCastData;

      if (doInference && HasteUtils.canInferHaste(current, spellData)) {
        this.updateInferredBuffs(current, spellData, inferrableBuffs);
      }

      // set delay to next cast
      this.setCastLatency(current, spellData, i);

      if (spellData.cooldown > 0) {
        prevCastData = this.findPreviousCast(current, i);
        if (prevCastData.onAll) {
          const delta = current.castStart - prevCastData.onAll.castEnd;
          if ((delta - (spellData.cooldown * 1000)) <= CastsAnalyzer.MAX_ACTIVE_DOWNTIME) {
            current.timeOffCooldown = (delta - (spellData.cooldown * 1000)) / 1000;
          }
        }
      }

      if (spellData.damageType === DamageType.NONE || current.resisted) {
        continue;
      }

      switch (spellData.damageType) {
        case DamageType.DOT:
          prevCastData = this.findPreviousCast(current, i, (c) => {
            // ignore dots that didn't resist, but also didn't tick with enough time to have done so
            // happens because of weird immunities/phase transitions, e.g. on Leotheras
            const minTimeToTick = spellData.maxDuration > 0 ?
              spellData.maxDuration / spellData.maxTicks :
              spellData.baseTickTime;

            return c.hitType !== HitType.NONE || (current.castStart - c.castEnd < minTimeToTick);
          });

          this.setDotDetails(current, spellData, prevCastData);
          break;

        case DamageType.CHANNEL:
          this.setChannelDetails(current, spellData, i);
          break;
      }
    }

    return new Report(this.analysis, this.casts);
  }

  private setCastLatency(current: CastDetails, spellData: ISpellData, index: number) {
    // ignore for off-GCD spells, last cast
    if (index > this.casts.length - 2 || !spellData.gcd) {
      return;
    }

    const next = this.casts[index + 1], gcd = current.gcd * 1000;
    const castTime = current.castTimeMs > gcd ? current.castTimeMs : gcd;

    const latency = Math.max(next.castStart - (current.castStart + castTime), 0);
    if (latency >= 0 && latency <= CastsAnalyzer.MAX_LATENCY) {
      current.nextCastLatency = latency/1000;
    }
  }

  private setDotDetails(current: CastDetails, spellData: ISpellData, prevData: IPreviousCast) {
    if (!prevData?.onTarget) {
      return;
    }

    const prev = prevData.onTarget;
    const prevSpellData = Spell.get(prev.spellId, this.analysis, prev.haste);

    if (prev.lastDamageTimestamp && (current.castEnd - prev.lastDamageTimestamp <= CastsAnalyzer.MAX_ACTIVE_DOWNTIME)) {
      current.dotDowntime = Math.max((current.castEnd - prev.lastDamageTimestamp) / 1000, 0);
    }

    const expectedEnd = prev.castEnd + (prevSpellData.maxDuration * 1000) + CastsAnalyzer.EARLY_CLIP_LEEWAY;
    if (prev.instances.length < spellData.maxDamageInstances && current.castEnd <= expectedEnd) {
      current.clippedPreviousCast = true;
      current.clippedTicks = spellData.maxDamageInstances - prev.instances.length;
    }
  }

  private setChannelDetails(current: CastDetails, spellData: ISpellData, index: number) {
    // other clipping casts require the next cast to evaluate
    if (index > this.casts.length - 2 || current.truncated) {
      return;
    }

    // Check for other early clipping cases
    if (current.hits < spellData.maxDamageInstances) {
      let timeToTick: number, castEnd: number;

      // prefer to use actual timestamps to evaluate tick time, over haste
      // just because it avoids some annoying rounding issues and timestamps being off a few ms
      if (current.instances.length > 0) {
        timeToTick = current.instances[0].timestamp - current.castEnd;
        castEnd = current.lastDamageTimestamp!;
      } else {
        timeToTick = (1 / (1 + current.haste)) * 1000;
        castEnd = current.castEnd;
      }

      const delta = this.casts[index + 1].castStart - castEnd;

      // if we clipped very close to the next expected tick, flag the cast.
      if (delta < timeToTick + CastsAnalyzer.EARLY_CLIP_LEEWAY) {
        const progressToTick = Math.min(delta/timeToTick, 1);

        current.clippedEarly = (progressToTick >= CastsAnalyzer.EARLY_CLIP_THRESHOLD);
        if (current.clippedEarly) {
          current.earlyClipLostDamageFactor = progressToTick;
        }
      }
    }
  }

  private updateInferredBuffs(cast: CastDetails, spellData: ISpellData, inferrable: IBuffDetails[]) {
    let error = HasteUtils.getHasteError(cast, spellData);

    for (const buff of inferrable) {
      const active = this.inferred.hasOwnProperty(buff.id);

      // if error on cast is below the threshold to remove the buff,
      // then remove the buff and continue checking other buffs
      if (active && error < buff.inferenceThresholds!.remove) {
        // add pseudo-event. Used for GCD Usage analysis.
        const insertionIndex = this.analysis.events.buffs.findIndex((b) => b.timestamp >= cast.castStart);
        this.analysis.events.buffs.splice(insertionIndex, 0, {
          type: 'removebuff',
          ability: { guid: buff.id, name: buff.name },
          targetID: this.analysis.actor.id,
          targetInstance: 0,
          timestamp: cast.castStart - 1,
          read: false
        });

        delete this.inferred[buff.id];
        continue;
      }

      // if the buff is previously active or the error on this cast is above the threshold to add it,
      // then
      if (active || error > buff.inferenceThresholds!.add) {
        cast.addBuff(buff);
        cast.haste = ((1 + cast.haste) * (1 + buff.haste)) - 1;
        error = HasteUtils.getHasteError(cast, spellData);

        if (!active) {
          // add pseudo-event. Used for GCD Usage analysis.
          const insertionIndex = this.analysis.events.buffs.findIndex((b) => b.timestamp >= cast.castStart);
          this.analysis.events.buffs.splice(insertionIndex, 0, {
            type: 'applybuff',
            ability: { guid: buff.id, name: buff.name },
            targetID: this.analysis.actor.id,
            targetInstance: 0,
            timestamp: cast.castStart - 1,
            read: false
          });

          this.inferred[buff.id] = buff;
        }
      }
    }
  }

  // find the last time this spell was cast on the same target
  private findPreviousCast(cast: CastDetails, currentIndex: number, condition?: CastPredicate): IPreviousCast {
    const prev: IPreviousCast = {};
    if (currentIndex === 0) {
      return prev;
    }

    for (let i = currentIndex - 1; i >= 0; i--) {
      const test = this.casts[i];
      if (test.spellId === cast.spellId && !this.failed(test) && (!condition || condition(test))) {
        if (!prev.onTarget && test.hasSameTarget(cast)) {
          prev.onTarget = test;
        }

        if (!prev.onAll) {
          prev.onAll = test;
        }

        if (prev.onTarget && prev.onAll) {
          return prev;
        }
      }
    }

    return prev;
  }

  private failed(cast: CastDetails) {
    return cast.hitType === HitType.RESIST || cast.hitType === HitType.IMMUNE;
  }
}

interface IPreviousCast {
  onTarget?: CastDetails;
  onAll?: CastDetails;
}

type CastPredicate = (cast: CastDetails) => boolean;
