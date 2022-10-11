import { BuffId } from 'src/app/logs/models/buff-id.enum';

export class Settings {
  public hasteRating: number|null = null;
  public improvedMindBlast = 5;
  public improvedMoonkinAura = true;
  public improvedRetAura = true;
  public wrathOfAir = true;
  public auras: number[] = [];

  constructor(settings?: ISettings) {
    if (settings) {
      this.hasteRating = settings.hasteRating;
      this.improvedMindBlast = settings.improvedMindBlast;
      this.improvedMoonkinAura = settings.improvedMoonkinAura;
      this.improvedRetAura = settings.improvedRetAura;
      this.wrathOfAir = settings.wrathOfAir;
      this.auras = settings.auras || [];
    }
  }

  equals(other: Settings) {
    return this.hasteRating === other.hasteRating &&
      this.improvedMindBlast === other.improvedMindBlast &&
      this.improvedMoonkinAura === other.improvedMoonkinAura &&
      this.improvedRetAura === other.improvedRetAura &&
      this.wrathOfAir === other.wrathOfAir &&
      this.auras.length === other.auras.length &&
      this.auras.every((id) => other.auras.includes(id));
  }

  haveAura(id: BuffId) {
    return this.auras?.some((a) => a === id) || false;
  }
}

export interface ISettings {
  hasteRating: number|null;
  improvedMindBlast: number;
  improvedMoonkinAura: boolean;
  improvedRetAura: boolean;
  wrathOfAir: boolean;
  auras?: number[];
}
