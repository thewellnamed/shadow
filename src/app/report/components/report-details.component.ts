import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';

import { Actor } from 'src/app/logs/models/actor';
import { IEncounterEvents, LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { IStatsSearch, PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { ParamsService, ParamType } from 'src/app/params.service';
import { ITabDefinition, TabDefinitions } from 'src/app/report/components/tabs';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { BaseSummary } from 'src/app/report/summary/base.summary';
import { IStatField } from 'src/app/report/summary/fields/base.fields';
import { EventService, IEvent } from 'src/app/event.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastDetails } from 'src/app/report/models/cast-details';
import { CombatantInfo } from 'src/app/logs/models/combatant-info';
import { Settings } from 'src/app/settings';
import { SettingsService } from 'src/app/settings.service';

@Component({
  selector: 'report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportDetailsComponent implements OnInit {
  logId: string;
  encounterId: number;
  playerId: string;

  log: LogSummary;
  analysis: PlayerAnalysis;
  actor: Actor;
  actorInfo: CombatantInfo;
  settings: Settings;
  highlight: StatHighlights;
  activeTab = 0;
  form: UntypedFormGroup;
  targets: { id: number; name: string }[];
  hitCount = -1;
  loading = true;
  tabs: ITab[];

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private location: Location,
              private route: ActivatedRoute,
              private logs: LogsService,
              private eventSvc: EventService,
              private settingsSvc: SettingsService,
              private params: ParamsService) {
  }

  ngOnInit(): void {
    this.initializeForm();
    this.route.paramMap.pipe(
      withLatestFrom(this.route.parent!.paramMap),
      switchMap(([params, parentParams]) => {
        this.logId = parentParams.get('logId') as string;
        this.playerId = params.get('player') as string;

        if (params.has('encounterId')) {
          this.encounterId = parseInt(params.get('encounterId') as string, 10);
        }

        this.loading = true;
        this.changeDetectorRef.detectChanges();

        return this.logs.getSummary(this.logId);
      }),
      switchMap((log: LogSummary) => {
        this.log = log;
        this.actor = this.log.getActorByRouteId(this.playerId) as Actor;
        this.settings = this.settingsSvc.get(this.playerId);

        if (this.encounterId) {
          return this.logs.getPlayerInfo(log, this.actor, this.encounterId);
        } else {
          return of(null)
        }
      }),
      switchMap((actorInfo: CombatantInfo|null) => {
        if (actorInfo) {
          this.actorInfo = actorInfo;
        }

        return this.fetchData();
      })
    ).subscribe((data) => {
      if (data) {
        this.analyze(data);
        this.initializeTabs();
      }

      this.loading = false;
      this.changeDetectorRef.detectChanges();
    });
  }

  onTabChange(event: { index: number }) {
    this.activeTab = event.index;
    this.updateActiveTab();

    if (this.activeTab > 0) {
      this.params.set(ParamType.TAB, this.activeTab);
    } else {
      this.params.clear(ParamType.TAB);
    }
  }

  onTargetChange(event: { value: number }) {
    this.setTarget(event.value);
    this.updateActiveTab();
  }

  onHitCountChange(event: IEvent<number>) {
    this.hitCount = event.data;
    this.updateActiveTab();

    if (event.data < 0) {
      this.params.clear(ParamType.TICKS);
    } else {
      this.params.set(ParamType.TICKS, this.hitCount);
    }
  }

  get target() {
    return this.form.get('target') as UntypedFormControl;
  }

  private initializeForm() {
    if (this.params.has(ParamType.TAB)) {
      const tab = parseInt(this.params.get(ParamType.TAB));
      if (tab >= 0 && tab <= 5) {
        this.activeTab = tab;
      }
    }

    if (this.params.has(ParamType.TICKS)) {
      this.hitCount = parseInt(this.params.get(ParamType.TICKS));
    }

    const target = this.params.has(ParamType.TARGET) ? parseInt(this.params.get(ParamType.TARGET)) : 0;
    this.form = new UntypedFormGroup({
      encounter: new UntypedFormControl(null),
      player: new UntypedFormControl(null),
      target: new UntypedFormControl(target)
    });
  }

  private initializeTabs() {
    this.tabs = TabDefinitions.map((definition) => {
      const summary = new (definition.summaryType)(this.analysis, this.highlight);
      const options = this.statOptions(definition.spellId);
      const stats = this.analysis.stats(options);

      return Object.assign({}, definition, {
        summary,
        casts: stats?.casts || [],
        stats: stats ? summary.report(stats) : [],
        hitCounts: this.analysis.hitCounts(options)
      }) as ITab;
    });

    this.eventSvc.subscribe<number>('hitCount', (e) => this.onHitCountChange(e));
  }

  private updateActiveTab() {
    const tab = this.tabs[this.activeTab];
    const options = this.statOptions(tab.spellId);
    const stats = this.analysis.stats(options);

    tab.casts = stats?.casts || [];
    tab.stats = stats ? tab.summary.report(stats) : [];
    tab.hitCounts = this.analysis.hitCounts(options);
  }

  private statOptions(spellId: SpellId): IStatsSearch {
    return {
      spellId,
      targetId: this.target.value || undefined,
      hitCount: this.hitCount
    };
  }

  private fetchData() {
    if (this.encounterId > 0) {
      return this.logs.getEvents(this.log, this.actor, this.encounterId);
    } else {
      return of(null);
    }
  }

  private analyze(events: IEncounterEvents) {
    if (events) {
      this.analysis = new PlayerAnalysis(this.log, this.encounterId, this.actor, this.actorInfo, this.settings, events);
      this.highlight = new StatHighlights(this.analysis);

      this.targets = this.analysis.targetIds
        .map((id) => ({ id , name: this.log.getActorName(id) }))
        .filter((t) => (t.name?.length || 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      if (this.targets.length === 1) {
        this.setTarget(this.targets[0].id);
      } else if (this.target.value && !this.analysis.targetIds.includes(this.target.value)) {
        this.setTarget(0);
      }
    }
  }

  private setTarget(targetId: number) {
    if (targetId > 0) {
      this.params.set(ParamType.TARGET, targetId);
    } else {
      this.params.clear(ParamType.TARGET);
    }

    if (this.target.value !== targetId) {
      this.target.setValue(targetId);
    }
  }
}

interface ITab extends ITabDefinition {
  summary: BaseSummary;
  stats: IStatField[];
  casts: CastDetails[];
  hitCounts: number[];
}
