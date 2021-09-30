import { CastsSummary } from 'src/app/report/models/casts-summary';
import { SpellData } from 'src/app/logs/models/spell-id.enum';

export class CastsAnalyzer {
  public static run(casts: CastsSummary) {
    for (let i = 0; i < casts.allCasts.length; i++) {
      const current = casts.allCasts[i],
        spellData = SpellData[current.spellId];

      if (!spellData.damage) {
        continue;
      }

      // check clipping
      if (spellData.maxDuration > 0) {

      }

      // check time between casts
      if (spellData.cooldown > 0) {

      }
    }

    return casts;
  }
}
