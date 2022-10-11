import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { format } from 'src/app/report/models/stat-utils';

@Component({
  selector: 'settings-hint-snackbar',
  templateUrl: './settings-hint.component.html',
  styleUrls: ['./settings-hint.component.scss']
})
export class SettingsHintComponent {
  public missingHaste: string;
  public description: string;

  private ref: MatSnackBarRef<SettingsHintComponent>;
  private callback: () => void;

  constructor (@Inject(MAT_SNACK_BAR_DATA) data: ISettingsHintData,
               ref: MatSnackBarRef<SettingsHintComponent>) {
    this.ref = ref;
    this.callback = data.openSettings;
    this.missingHaste = format(Math.abs(data.hasteError * 100), 1, '%');
    this.description = data.hasteError < 0 ? 'Excess' : 'Missing';
  }

  openSettings(event: Event) {
    event.preventDefault();
    this.callback();
  }

  dismiss(event: Event) {
    event.preventDefault();
    this.ref.dismiss();
  }
}

export interface ISettingsHintData {
  hasteError: number;
  openSettings: () => void;
}
