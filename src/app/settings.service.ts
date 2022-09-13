import { Injectable } from '@angular/core';
import { Settings } from 'src/app/settings';

@Injectable()
export class SettingsService {
  public get() {
    const stored = localStorage.getItem('settings');

    if (stored === null) {
      return new Settings();
    }

    return new Settings(JSON.parse(stored));
  }

  public update(settings: Settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
  }
}
