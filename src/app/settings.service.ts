import { Injectable } from '@angular/core';
import { Settings } from 'src/app/settings';

@Injectable()
export class SettingsService {
  public get(playerName: string) {
    const stored = localStorage.getItem(this.key(playerName));

    if (stored === null) {
      return new Settings();
    }

    return new Settings(JSON.parse(stored));
  }

  public update(playerName: string, settings: Settings) {
    localStorage.setItem(this.key(playerName), JSON.stringify(settings));
  }

  private key(playerName: string) {
    return `settings_${playerName}`;
  }
}
