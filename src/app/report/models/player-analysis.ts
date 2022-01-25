import { LogSummary } from 'src/app/logs/models/log-summary';
import { ICombatantInfo } from 'src/app/logs/interfaces';
import { IEncounterEvents } from 'src/app/logs/logs.service';
import { Report } from 'src/app/report/models/report';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { GcdAnalyzer } from 'src/app/report/analysis/gcd-analyzer';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';

export class PlayerAnalysis {
  public log: LogSummary;
  public encounter: EncounterSummary;
  public playerInfo: ICombatantInfo;
  public report: Report;
  public totalGcds: number;

  constructor(log: LogSummary, encounterId: number, playerInfo: ICombatantInfo, events: IEncounterEvents) {
    this.log = log;
    this.encounter = log.getEncounter(encounterId) as EncounterSummary;
    this.playerInfo = playerInfo;

    // analyze event info
    const casts = new EventAnalyzer(this.log, this.encounter, this.playerInfo.stats, events).createCasts();
    this.report = new CastsAnalyzer(casts).run();

    // find total possible GCDs in encounter
    this.totalGcds = new GcdAnalyzer(this.encounter, this.playerInfo.stats, events.buffs).totalGcds;
  }

  get targetIds(): number[] {
    return this.report?.targetIds || [];
  }
}
