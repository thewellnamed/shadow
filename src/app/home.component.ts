import { Component, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { Router } from '@angular/router';

import { LogsService } from 'src/app/logs/logs.service';
import { LogSummary } from 'src/app/logs/log-summary';
import { EncounterSummary } from 'src/app/logs/encounter-summary';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  @ViewChild('selectEncounter') public encounterSelect: MatSelect;
  @ViewChild('selectPlayer') public playerSelect: MatSelect;
  public summary?: LogSummary;
  public form: FormGroup;
  public searching = false;
  public encounters: EncounterSummary[];

  private logId?: string;

  constructor(private logs: LogsService,
              private router: Router) {
    this.form = new FormGroup({
      log: new FormControl(null, this.validateLogId),
      encounter: new FormControl({ value: null, disabled: true }),
      player: new FormControl({ value: null, disabled: true })
    });
  }

  get log() {
    return this.form.get('log');
  }

  get encounter() {
    return this.form.get('encounter');
  }

  get player() {
    return this.form.get('player');
  }

  validateLogId = (control: AbstractControl): ValidationErrors | null => {
    if (control.dirty && this.logs.extractLogId(control.value) === null) {
      return { 'invalid': true };
    }

    return null;
  }

  loadReport() {
    const logId = this.logs.extractLogId(this.log?.value);

    if (logId) {
      this.searching = true;
      this.logs.getSummary(logId).subscribe({
        next: (summary) => {
          this.searching = false;
          this.logId = logId;

          this.summary = summary;
          this.log?.markAsPristine();

          this.encounter?.enable();
          this.player?.enable();

          if (summary.players.length === 1) {
            this.player!.setValue(summary.players[0].id);
            this.filterEncounters();
            this.encounterSelect.focus();
          } else {
            this.playerSelect.focus();
          }
        },
        error: (err: string) => {
          this.searching = false;
          this.logId = undefined;

          this.summary = undefined;
          this.log?.setErrors({ wcl: err });
          this.log?.markAsTouched();
        }
      });
    }
  }

  get formComplete() {
    return this.summary && this.encounter?.value && this.player?.value;
  }

  analyze() {
    const playerName = this.summary?.getPlayer(this.player?.value)?.name;
    this.router.navigateByUrl(`report/${this.logId}/${playerName}/${this.encounter?.value}`);
  }

  private filterEncounters() {
    this.encounters = this.summary?.encounters as EncounterSummary[];
  }

}
