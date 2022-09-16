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
import { Settings } from 'src/app/settings';
import { EventPreprocessor } from 'src/app/report/analysis/event-preprocessor';

export class PlayerAnalysis {
  public log: LogSummary;
  public encounter: EncounterSummary;
  public actor: Actor;
  public actorInfo: CombatantInfo;
  public settings: Settings;
  public events: IEncounterEvents;
  public report: Report;
  public totalGcds: number;

  private _applyWrathOfAir: boolean;

  constructor(log: LogSummary, encounterId: number, actor: Actor, actorInfo: CombatantInfo, settings: Settings, events: IEncounterEvents) {
    this.log = log;
    this.encounter = log.getEncounter(encounterId) as EncounterSummary;
    this.actor = actor;
    this.actorInfo = Object.assign({}, actorInfo);
    this.settings = settings;

    // pre-process events
    this.events = new EventPreprocessor(this, events).run();

    // apply haste rating from settings if missing from log
    if (this.actorInfo.stats?.Haste === undefined && settings.hasteRating) {
      this.actorInfo.stats = { Haste: { min: settings.hasteRating, max: settings.hasteRating }};
    }

    // analyze events and generate casts report
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

  // if a shaman is in the raid, and wrath of air is enabled in settings...
  get applyWrathOfAir() {
    if (this._applyWrathOfAir !== undefined) {
      return this._applyWrathOfAir;
    }

    if (!this.settings?.wrathOfAir) {
      this._applyWrathOfAir = false;
    } else {
      const shamans = this.log.actors.filter((a) => {
        return a.type === 'Shaman' && a.encounterIds.includes(this.encounter.id)
      });

      this._applyWrathOfAir = shamans.length > 0;
    }
    return this._applyWrathOfAir;
  }
}

export interface IStatsSearch {
  spellId: number;
  targetId: number;
  hitCount: number;
}
