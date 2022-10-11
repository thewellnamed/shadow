import { CastDetails } from 'src/app/report/models/cast-details';
import { ICastData, IDamageData } from 'src/app/logs/interfaces';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { ISpellData } from 'src/app/logs/models/spell-data';

export function matchTarget(analysis: PlayerAnalysis,
                            source: CastDetails|ICastData,
                            spellData: ISpellData,
                            dest: IDamageData,
                            allowUnknown = false) {
  const sourceId = source instanceof CastDetails ? source.targetId : source.targetID;

  // multi-target channeled spells should skip this check (targetID is set on cast, but the damage hits are different)
  if (spellData.multiTarget) {
    return true;
  }

  // must match instance if one exists
  if (source.targetInstance && source.targetInstance !== dest.targetInstance) {
    return false;
  }

  // Must match targetId if one exists... usually
  // There's a weird bug in WCL sometimes where the cast on a target has a different target ID
  // than the damage ticks, shows up as "Unknown Actor," and isn't returned as an enemy in the summary
  // If allowUnknown === true, relax the target ID match to handle this case specifically
  // We can tell the ID is "unknown actor" if no actor name exists for it.
  if (sourceId && sourceId !== dest.targetID && (!allowUnknown || analysis.getActorName(sourceId) !== undefined)) {
    return false;
  }

  return true;
}
