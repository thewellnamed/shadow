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

  public showHint(playerName: string, encounterId: number): boolean {
    return sessionStorage.getItem(this.hintKey(playerName, encounterId)) !== 'true';
  }

  public dismissHint(playerName: string, encounterId: number) {
    sessionStorage.setItem(this.hintKey(playerName, encounterId), 'true');
  }

  private key(playerName: string) {
    return `settings_${playerName.toLocaleLowerCase()}`;
  }

  private hintKey(playerName: string, encounterId: number) {
    return `${this.key(playerName)}_${encounterId}_hint`;
  }
}
