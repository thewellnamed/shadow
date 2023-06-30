import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { AuraId } from 'src/app/logs/models/aura-id.enum';
import { ParamsService } from 'src/app/params.service';
import { SettingsService } from 'src/app/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ISettings, Settings } from 'src/app/settings';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { LogSummary } from 'src/app/logs/models/log-summary';
import { LogsService } from 'src/app/logs/logs.service';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';

@Component({
  selector: 'report-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent implements OnInit {
  logId: string;
  encounterId: number;
  playerId: string;

  analysis: PlayerAnalysis;
  logHasteRating: number|null;
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
        this.encounterId = parseInt(params.get('encounterId') as string, 10);

        const analysis = PlayerAnalysis.getCached(this.logId, this.encounterId, this.playerId);

        if (analysis) {
          return of(analysis);
        } else {
          return this.logs.createAnalysis(this.logId, this.playerId, this.encounterId);
        }
      })
    ).subscribe((analysis: PlayerAnalysis) => {
      this.analysis = analysis;
      this.analysis.refresh(this.settingsSvc.get(this.playerId));
      this.logHasteRating = analysis.actorInfo?.stats?.hasteRating || analysis.settings.hasteRating || null;
      const t9Bonus2pc = analysis.actorInfo?.bonuses?.hasOwnProperty(SpellId.VAMPIRIC_TOUCH);

      this.form = new FormGroup<ISettingsForm>({
        hasteRating: new FormControl(this.logHasteRating),
        improvedMindBlast: new FormControl(analysis.settings.improvedMindBlast, { nonNullable: true }),
        improvedMoonkinAura: new FormControl(analysis.settings.improvedMoonkinAura, { nonNullable: true }),
        improvedRetAura: new FormControl(analysis.settings.improvedRetAura, { nonNullable: true }),
        wrathOfAir: new FormControl(analysis.settings.wrathOfAir, { nonNullable: true }),
        t9bonus2pc: new FormControl(t9Bonus2pc || analysis.settings.t9bonus2pc, { nonNullable: true }),
        moonkinAura: new FormControl(this.auraState(AuraId.MOONKIN_AURA), { nonNullable: true })
      });

      if (this.analysis.actorInfo?.initFromLog) {
        this.form.controls.hasteRating.disable();
        this.form.controls.t9bonus2pc.disable();
        this.form.controls.moonkinAura.disable();
      }
    });
  }

  cancel(event: Event) {
    event.preventDefault();
    this.exitSettings();
  }

  apply(event: Event) {
    event.preventDefault();

    const settings = new Settings(this.form.value as ISettings);

    // form.value excludes disabled controls. That's annoying.
    settings.hasteRating = this.form.controls.hasteRating.value;

    if (!this.analysis.actorInfo?.initFromLog) {
      if (this.form.controls.moonkinAura.value) {
        settings.auras.push(AuraId.MOONKIN_AURA);
      }
    }

    this.settingsSvc.update(this.playerId, settings);
    this.exitSettings();
  }

  private exitSettings() {
    this.router.navigate(['/report', this.logId, this.playerId, this.encounterId], {
      queryParams: this.params.forNavigation()
    });
  }


  private auraState(id: AuraId) {
    if (this.analysis.actorInfo?.initFromLog) {
      return this.analysis.actorInfo.haveAura(id);
    }

    return this.analysis.settings.haveAura(id);
  }
}

interface ISettingsForm {
  hasteRating: FormControl<number|null>;
  improvedMindBlast: FormControl<number>;
  improvedMoonkinAura: FormControl<boolean>;
  improvedRetAura: FormControl<boolean>;
  wrathOfAir: FormControl<boolean>;
  t9bonus2pc: FormControl<boolean>;
  moonkinAura: FormControl<boolean>;
}
