import { CastDetails } from 'src/app/report/models/cast-details';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { DamageType, SpellData } from 'src/app/logs/models/spell-data';

export class CastsAnalyzer {
  private summary: CastsSummary;
  private casts: CastDetails[];

  constructor(summary: CastsSummary) {
    this.summary = summary;
    this.casts = summary.allCasts;
  }

  public run() {
    for (let i = 0; i < this.casts.length; i++) {
      const current = this.casts[i],
        spellData = SpellData[current.spellId];

      let previous = this.findPreviousCast(current, i);

      if (spellData.damageType === DamageType.NONE || current.totalDamage === 0) {
        continue;
      }

      if (previous) {
        // for DoTs, calculate downtime
        if (spellData.damageType === DamageType.DOT && previous.lastDamageTimestamp) {
          current.dotDowntime = (current.castEnd - previous.lastDamageTimestamp) / 1000;
        }

        // for DoTs and flay, check for clipping of previous cast
        if (spellData.maxDamageInstances > 1) {
          const expectedPreviousDuration = previous.castEnd + (spellData.maxDuration * 1000);
          if (previous.ticks < spellData.maxDamageInstances && current.castEnd <= expectedPreviousDuration) {
            current.clippedPreviousCast = true;
            current.clippedTicks = spellData.maxDamageInstances - previous.ticks;
          }
        }
      }

      // check time between casts
      if (spellData.cooldown > 0) {
        previous = this.findPreviousCast(current, i, true);

        if (previous) {
          current.timeOffCooldown = ((current.castStart - previous.castEnd) - (spellData.cooldown * 1000)) / 1000;
        }
      }

      // for flay, calculate latency from effective end of channel (last tick) to start of next cast
      if (spellData.damageType === DamageType.CHANNEL && i < this.casts.length - 1 && current.lastDamageTimestamp) {
        const next = this.casts[i + 1];
        current.nextCastLatency = (next.castStart - current.lastDamageTimestamp) / 1000;
      }
    }

    return this.summary;
  }

  // find the last time this spell was cast on the same target
  private findPreviousCast(cast: CastDetails, currentIndex: number, allTargets = false): CastDetails|null {
    if (currentIndex === 0) {
      return null;
    }

    for (let i = currentIndex - 1; i >= 0; i--) {
      const test = this.casts[i];
      if (test.spellId === cast.spellId && test.totalDamage > 0 && (allTargets || test.hasSameTarget(cast))) {
        return test;
      }
    }

    return null;
  }
}
