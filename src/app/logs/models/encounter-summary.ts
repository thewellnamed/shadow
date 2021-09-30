import { IEncounterData } from 'src/app/logs/logs.service';

export class EncounterSummary {
  id: number;
  start: number;
  end: number;
  durationSeconds: number;
  description: string;
  kill: boolean;

  constructor(data: IEncounterData) {
    this.id = data.id;
    this.start = data.start_time;
    this.end = data.end_time;
    this.durationSeconds = Math.round((data.end_time - data.start_time) / 1000);
    this.kill = data.kill || false;
    this.description = `${data.name} (${this.durationFormatted}, ${this.status})`;
  }

  get durationFormatted() {
    const minutes = Math.floor(this.durationSeconds / 60),
      seconds = this.durationSeconds - (minutes * 60);

    return `${minutes}:${(seconds + '').padStart(2, '0')}`;
  }

  get status() {
    return this.kill === true ? 'Kill' : 'Wipe';
  }
}
