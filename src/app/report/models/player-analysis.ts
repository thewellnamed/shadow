import { CastStats } from 'src/app/report/models/cast-stats';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { ICombatantInfo } from 'src/app/logs/interfaces';
import { IEncounterEvents } from 'src/app/logs/logs.service';
import { Report } from 'src/app/report/models/report';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { GcdAnalyzer } from 'src/app/report/analysis/gcd-analyzer';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { SpellData } from 'src/app/logs/models/spell-data';
import { SpellStats } from 'src/app/report/models/spell-stats';

export class PlayerAnalysis {
  public log: LogSummary;
  public encounter: EncounterSummary;
  public actorInfo: ICombatantInfo;
  public report: Report;
  public totalGcds: number;

  constructor(log: LogSummary, encounterId: number, actorInfo: ICombatantInfo, events: IEncounterEvents) {
    this.log = log;
    this.encounter = log.getEncounter(encounterId) as EncounterSummary;
    this.actorInfo = actorInfo;

    // analyze event info
    const casts = new EventAnalyzer(this.log, this.encounter, this.actorInfo.stats, events).createCasts();
    this.report = new CastsAnalyzer(casts).run();

    // find total possible GCDs in encounter
    this.totalGcds = new GcdAnalyzer(this.encounter, this.actorInfo.stats, events.buffs).totalGcds;
  }

  get targetIds(): number[] {
    return this.report?.targetIds || [];
  }

  getActorName(targetId: number, targetInstance: number) {
    return this.log.getActorName(targetId, targetInstance);
  }

  stats(options: IStatsSearch): CastStats|undefined {
    let stats = options.spellId === SpellId.NONE ?
      this.report.stats :
      this.report.getSpellStats(options.spellId);

    if (options.hitCount >= 0 && SpellData[options.spellId]?.statsByTick) {
      stats = (stats as SpellStats).statsByHitCount(options.hitCount);
    }

    if (options.targetId) {
      stats = stats.targetStats(options.targetId);
    }

    return stats;
  }

  hitCounts(options: IStatsSearch) {
    let stats = options.spellId === SpellId.NONE ?
      this.report.stats :
      this.report.getSpellStats(options.spellId);

    if (options.targetId) {
      stats = stats.targetStats(options.targetId);
    }

    return stats?.hitCounts || [];
  }
}

export interface IStatsSearch {
  spellId: number;
  targetId: number;
  hitCount: number;
}
