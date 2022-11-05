import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';

import { LogsService } from 'src/app/logs/logs.service';
import { IStatsSearch, PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { ParamsService, ParamType } from 'src/app/params.service';
import { ITabDefinition, TabDefinitions } from 'src/app/report/components/tabs';
import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { BaseSummary } from 'src/app/report/summary/base.summary';
import { IStatField } from 'src/app/report/summary/fields/base.fields';
import { EventService, IEvent } from 'src/app/event.service';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { CastDetails } from 'src/app/report/models/cast-details';
import { SettingsService } from 'src/app/settings.service';
import { SettingsHintComponent } from 'src/app/report/components/settings-hint.component';
import { Spell } from 'src/app/logs/models/spell-data';

@Component({
  selector: 'report-details',
  templateUrl: './report-details.component.html',
  styleUrls: ['./report-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportDetailsComponent implements OnInit, OnDestroy {
  logId: string;
  encounterId: number;
  playerId: string;

  analysis: PlayerAnalysis;
  highlight: StatHighlights;
  activeTab = 0;
  form: UntypedFormGroup;
  targets: { id: number; name: string }[];
  downranked: IDownrankedSpell[];
  hitCount = -1;
  loading = true;
  showDownrankWarning = false;
  tabs: ITab[];

  private snackBarRef: MatSnackBarRef<SettingsHintComponent>;

  constructor(private changeDetectorRef: ChangeDetectorRef,
              private location: Location,
              private router: Router,
              private route: ActivatedRoute,
              private logs: LogsService,
              private eventSvc: EventService,
              private settingsSvc: SettingsService,
              private params: ParamsService,
              private snackBar: MatSnackBar,
              private title: Title) {
  }

  ngOnInit(): void {
    this.initializeForm();

    this.route.paramMap.pipe(
      withLatestFrom(this.route.parent!.paramMap),
      switchMap(([params, parentParams]) => {
        this.logId = parentParams.get('logId') as string;
        this.playerId = params.get('player') as string;
        this.loading = true;
        this.changeDetectorRef.detectChanges();

        if (params.has('encounterId')) {
          this.encounterId = parseInt(params.get('encounterId') as string, 10);
          const analysis = PlayerAnalysis.getCached(this.logId, this.encounterId, this.playerId);

          if (analysis) {
            return of(analysis);
          } else {
            return this.logs.createAnalysis(this.logId, this.playerId, this.encounterId);
          }
        }

        return of(null);
      })
    ).subscribe((analysis: PlayerAnalysis|null) => {
      if (analysis) {
        this.analysis = analysis;
        this.analysis.refresh(this.settingsSvc.get(this.playerId));
        this.highlight = new StatHighlights(this.analysis);

        this.targets = this.analysis.targetIds
          .map((id) => ({id, name: this.analysis.log.getActorName(id)}))
          .filter((t) => (t.name?.length || 0) > 0)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (this.targets.length === 1) {
          this.setTarget(this.targets[0].id);
        } else if (this.target.value && !this.analysis.targetIds.includes(this.target.value)) {
          this.setTarget(0);
        }

        this.title.setTitle(this.analysis.title);
        this.initializeTabs();
        this.checkDownranking();
      } else if (this.playerId) {
        this.title.setTitle(this.playerId);
      }

      this.loading = false;
      this.changeDetectorRef.detectChanges();
      this.checkHasteError();
    });
  }

  ngOnDestroy() {
    this.snackBarRef?.dismiss();
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

  openSettings() {
    this.router.navigate(['settings'], {
      relativeTo: this.route
    });
  }

  closeSnackbar() {
    this.settingsSvc.dismissHint(this.playerId, this.encounterId);
    this.snackBarRef?.dismiss();
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

  private checkDownranking() {
    const downranked: {[id: number]: IDownrankedSpell} = this.analysis.report.casts.reduce((downranked, cast) => {
      if (cast.downranked) {
        const castRank = cast.rank as number;
        if (downranked.hasOwnProperty(cast.spellId)) {
          const existing = downranked[cast.spellId];
          if (existing.rank < castRank) {
            existing.rank = castRank;
          }
        } else {
          downranked[cast.spellId] = {
            name: cast.name,
            rank: castRank,
            max: Spell.baseData(cast.spellId).maxRank as number
          };
        }
      }

      return downranked;
    }, {} as {[id: number]: IDownrankedSpell});

    this.downranked = Object
      .values(downranked)
      .sort((a, b) => a.name.localeCompare(b.name));
    this.showDownrankWarning = this.downranked.length > 0;
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

  private checkHasteError() {
    if (this.snackBarRef) {
      this.snackBarRef.dismiss();
    }

    const hasteRating = this.analysis?.actorInfo?.stats?.hasteRating;
    const hasteError = this.analysis?.report?.stats?.avgHasteError || 0;
    const castCount = this.analysis?.report?.stats?.hasteErrorCastCount || 0;

    // eslint-disable-next-line no-console
    console.log(`Avg Haste Error: ${Math.round(hasteError * 10000)/100}%; Cast Count: ${castCount}`);

    if (hasteRating === undefined || (castCount > 10 && Math.abs(hasteError) > .03)) {
      this.openSnackbar(hasteRating === undefined ? undefined : hasteError);
    }
  }

  private openSnackbar(hasteError?: number) {
    if (this.settingsSvc.showHint(this.playerId, this.encounterId)) {
      this.snackBarRef = this.snackBar.openFromComponent(SettingsHintComponent, {
        data: {
          hasteError,
          close: () => this.closeSnackbar(),
          openSettings: () => this.openSettings()
        },
        panelClass: 'snackbar'
      });
    }
  }
}

interface ITab extends ITabDefinition {
  summary: BaseSummary;
  stats: IStatField[];
  casts: CastDetails[];
  hitCounts: number[];
}

interface IDownrankedSpell {
  name: string;
  rank: number;
  max: number;
}
