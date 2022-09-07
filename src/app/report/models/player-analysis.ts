import { CastStats } from 'src/app/report/models/cast-stats';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { IEncounterEvents } from 'src/app/logs/logs.service';
import { Report } from 'src/app/report/models/report';
import { EventAnalyzer } from 'src/app/report/analysis/event-analyzer';
import { GcdAnalyzer } from 'src/app/report/analysis/gcd-analyzer';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { CastsAnalyzer } from 'src/app/report/analysis/casts-analyzer';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { Spell } from 'src/app/logs/models/spell-data';
import { SpellStats } from 'src/app/report/models/spell-stats';
import { Actor } from 'src/app/logs/models/actor';
import { CombatantInfo } from 'src/app/logs/models/combatant-info';

export class PlayerAnalysis {
  public log: LogSummary;
  public encounter: EncounterSummary;
  public actor: Actor;
  public actorInfo: CombatantInfo;
  public events: IEncounterEvents;
  public report: Report;
  public totalGcds: number;

  constructor(log: LogSummary, encounterId: number, actor: Actor, actorInfo: CombatantInfo, events: IEncounterEvents) {
    this.log = log;
    this.encounter = log.getEncounter(encounterId) as EncounterSummary;
    this.actor = actor;
    this.actorInfo = actorInfo;
    this.events = events;

    // filter out extraneous shadow fiend events
    // todo -- would probably be nicer to find a way to avoid querying these...
    this.events.damage = this.events.damage
      .filter((e) => e.sourceID === this.actor.id || e.sourceID === this.actor.shadowFiendId)
      .map((e) => Object.assign({}, e, { read: false }));

    // analyze event info
    const casts = new EventAnalyzer(this).createCasts();
    this.report = new CastsAnalyzer(this, casts).run();

    // find total possible GCDs in encounter
    this.totalGcds = new GcdAnalyzer(this).totalGcds;
  }

  get targetIds(): number[] {
    return this.report?.targetIds || [];
  }

  getActor(actorId: number, friendly = true) {
    return this.log.getActor(actorId, friendly);
  }

  getActorName(targetId: number, targetInstance?: number) {
    return this.log.getActorName(targetId, targetInstance);
  }

  stats(options: IStatsSearch): CastStats|undefined {
    let stats = options.spellId === SpellId.NONE ?
      this.report.stats :
      this.report.getSpellStats(options.spellId);

    if (options.hitCount >= 0 && Spell.data[options.spellId]?.statsByTick) {
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
