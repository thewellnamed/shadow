import { FormGroup, FormControl } from '@angular/forms';
import { of } from 'rxjs';

import { Component, OnInit } from '@angular/core';
import { ParamsService } from 'src/app/params.service';
import { SettingsService } from 'src/app/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Settings } from 'src/app/settings';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { Actor } from 'src/app/logs/models/actor';
import { CombatantInfo } from 'src/app/logs/models/combatant-info';
import { LogsService } from 'src/app/logs/logs.service';

@Component({
  selector: 'report-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  log: LogSummary;
  logId: string;
  encounterId: number;
  playerId: string;
  actor: Actor;
  logHasteRating: number|null;
  settings: Settings;
  form: FormGroup<ISettingsForm>;

  constructor(private logs: LogsService,
              private router: Router,
              private route: ActivatedRoute,
              private params: ParamsService,
              private settingsSvc: SettingsService) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      withLatestFrom(this.route.parent!.paramMap),
      switchMap(([params, parentParams]) => {
        this.logId = parentParams.get('logId') as string;
        this.playerId = params.get('player') as string;

        if (params.has('encounterId')) {
          this.encounterId = parseInt(params.get('encounterId') as string, 10);
        }

        return this.logs.getSummary(this.logId);
      }),
      switchMap((log: LogSummary) => {
        this.log = log;
        this.actor = this.log.getActorByRouteId(this.playerId) as Actor;

        if (this.encounterId) {
          return this.logs.getPlayerInfo(log, this.actor, this.encounterId);
        } else {
          return of(null)
        }
      })
    ).subscribe((playerInfo: CombatantInfo|null) => {
      // initialize Form
      this.logHasteRating = playerInfo?.stats?.Haste?.min || null;
      this.settings = this.settingsSvc.get();

      this.form = new FormGroup<ISettingsForm>({
        hasteRating: new FormControl(this.logHasteRating),
        improvedMindBlast: new FormControl(this.settings.improvedMindBlast, { nonNullable: true }),
        improvedMoonkinAura: new FormControl(this.settings.improvedMoonkinAura, { nonNullable: true }),
        improvedRetAura: new FormControl(this.settings.improvedRetAura, { nonNullable: true }),
        wrathOfAir: new FormControl(this.settings.wrathOfAir, { nonNullable: true })
      });

      if (this.logHasteRating === null) {
        this.form.controls.hasteRating.disable();
      }
    });
  }

  cancel() {
    this.exitSettings();
  }

  apply() {
    this.settingsSvc.update(new Settings(this.form.getRawValue()))
    this.exitSettings();
  }

  private exitSettings() {
    this.router.navigate([this.playerId, this.encounterId], {
      relativeTo: this.route,
      queryParams: this.params.forNavigation()
    });
  }
}

interface ISettingsForm {
  hasteRating: FormControl<number|null>;
  improvedMindBlast: FormControl<number>;
  improvedMoonkinAura: FormControl<boolean>;
  improvedRetAura: FormControl<boolean>;
  wrathOfAir: FormControl<boolean>;
}
