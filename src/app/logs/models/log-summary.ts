import { IEncountersResponse } from 'src/app/logs/logs.service';
import { EncounterSummary } from 'src/app/logs/models/encounter-summary';
import { Actor } from 'src/app/logs/models/actor';

/**
 * Model WCL data for a given log
 */
export class LogSummary {
  title: string;
  owner: string;
  url: string;
  encounters: EncounterSummary[];
  actors: Actor[];
  shadowPriests: Actor[] = [];
  names: {[id: number]: string} = {};

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

    const allEnemies = data.enemies
      .concat(data.enemyPets)
      .map((enemyData) => {
        const actor = new Actor(enemyData, false);
        this.names[actor.id] = actor.name;
        return actor;
      });

    const allFriendlies = data.friendlies
      .concat(data.friendlyPets)
      .map((friendlyData) => {
        const actor = new Actor(friendlyData, true);
        this.names[actor.id] = actor.name;

        if (friendlyData.icon === 'Priest-Shadow') {
          this.shadowPriests.push(actor);
        }
        return actor;
      });

    this.actors = allEnemies.concat(allFriendlies);

    // Find shadowfiends and assign to their respective priests
    const fiends = this.actors.filter((a) => a.friendly && a.pet && a.name === 'Shadowfiend');
    for (const fiend of fiends) {
      if (fiend.owner !== undefined) {
        const priest = this.getActor(fiend.owner);
        if (priest) {
          priest.shadowFiendId = fiend.id;
        }
      }
    }
  }

  getEncounter(id: number) {
    return this.encounters.find((e) => e.id === id);
  }

  getActor(id: number, friendly = true) {
    return this.actors.find((a) => a.id === id && a.friendly === friendly);
  }

  getActorByName(name: string) {
    return this.actors.find((a) => a.name === name);
  }

  getActorEncounters(id: number, friendly = true) {
    const actor = this.getActor(id, friendly);
    if (!actor) {
      return [];
    }

    return this.encounters.filter((e) => actor.encounterIds.includes(e.id))
  }

  getActorName(id: number, instance?: number) {
    let name = this.names[id];

    if (name && instance) {
      name = `${name} #${instance}`;
    }

    return name;
  }
}
