import { IEncountersResponse, IPlayerData } from 'src/app/logs/logs.service';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';

/**
 * Model WCL data for a given log
 */
export class LogSummary {
  public title: string;
  public owner: string;
  public url: string;
  public encounters: EncounterSummary[];
  public players: IPlayerSummary[]
  public names: {[id: number]: string};

  constructor(public id: string, data: IEncountersResponse) {
    this.title = data.title;
    this.owner = data.owner;
    this.url = `https://classic.warcraftlogs.com/reports/${id}`;

    this.encounters = data.fights
      .filter((fight) => {
        // only boss fights with a duration
        return (fight.boss > 0 || fight.originalBoss > 0) && fight.end_time > (fight.start_time + 1000);
      })
      .map((fight) => new EncounterSummary(fight));

    // initialize names from enemy data. We'll add player names to it.
    this.names = data.enemies
      .concat(data.enemyPets)
      .reduce((enemies, next) => {
        enemies[next.id] = next.name;
        return enemies;
      }, {} as {[id: number]: string});

    // Only shadow priests
    this.players = data.friendlies
      .filter((f) => f.icon === 'Priest-Shadow')
      .map((f) => {
        this.names[f.id] = f.name;
        return {
          id: f.id,
          name: f.name,
          encounterIds: f.fights.map((d) => d.id)
        };
      });
  }

  getEncounter(id: number) {
    return this.encounters.find((e) => e.id === id);
  }

  getPlayer(id: number) {
    return this.players.find((p) => p.id === id);
  }

  getPlayerEncounters(id: number) {
    const player = this.getPlayer(id);
    if (!player) {
      return [];
    }

    return this.encounters.filter((e) => player.encounterIds.includes(e.id))
  }

  getPlayerByName(name: string) {
    return this.players.find((p) => p.name === name);
  }

  getUnitName(id: number, instance?: number) {
    let name = this.names[id];

    if (name && instance) {
      name = `${name} #${instance}`;
    }

    return name;
  }
}

export interface IPlayerSummary {
  id: number;
  name: string;
  encounterIds: number[];
}
