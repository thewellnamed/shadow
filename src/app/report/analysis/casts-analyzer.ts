import { CastDetails } from 'src/app/report/models/cast-details';
import { CastsSummary } from 'src/app/report/models/casts-summary';
import { SpellData, SpellId } from 'src/app/logs/models/spell-id.enum';

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

      if (!spellData.damage || current.totalDamage === 0) {
        continue;
      }

      // for DoTs, calculate downtime
      if (spellData.maxDuration > 0) {
        const previous = this.findPreviousCast(current, i);
        if (previous) {
          current.dotDowntime = (current.castEnd - previous.lastDamageTimestamp) / 1000;
        }
      }

      // for flay, calculate clipping latency
      if (current.spellId === SpellId.MIND_FLAY && i < this.casts.length - 1) {
        const next = this.casts[i + 1];
        current.clipLatency = (next.castStart - current.lastDamageTimestamp) / 1000;
      }

      // check time between casts
      if (spellData.cooldown > 0) {
        const previous = this.findPreviousCast(current, i, true);
        if (previous) {
          current.timeOffCooldown = ((current.castStart - previous.castEnd)/1000) - spellData.cooldown;
        }
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
