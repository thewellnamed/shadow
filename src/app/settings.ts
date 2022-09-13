export class Settings {
  public hasteRating: number|null = null;
  public improvedMindBlast = 5;
  public improvedMoonkinAura = true;
  public improvedRetAura = true;
  public wrathOfAir = false;

  constructor(settings?: ISettings) {
    if (settings) {
      this.hasteRating = settings.hasteRating;
      this.improvedMindBlast = settings.improvedMindBlast;
      this.improvedMoonkinAura = settings.improvedMoonkinAura;
      this.improvedRetAura = settings.improvedRetAura;
      this.wrathOfAir = settings.wrathOfAir;
    }
  }
}

export interface ISettings {
  hasteRating: number|null;
  improvedMindBlast: number;
  improvedMoonkinAura: boolean;
  improvedRetAura: boolean;
  wrathOfAir: boolean;
}
