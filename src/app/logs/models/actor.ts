import { IActorData } from 'src/app/logs/interfaces';

export class Actor {
  id: number;
  name: string;
  anon: boolean;
  type: string;
  icon: string;
  pet: boolean;
  owner: number|undefined;
  friendly: boolean;
  encounterIds: number[];
  shadowFiendId: number;

  constructor(data: IActorData, friendly: boolean, anon = false) {
    this.id = data.id;
    this.anon = anon;
    this.name = data.name;
    this.type = data.type;
    this.icon = data.icon;
    this.pet = data.petOwner !== undefined;
    this.owner = data.petOwner;
    this.friendly = friendly;
    this.encounterIds = data.fights.map((f) => f.id);
  }

  get routeId() {
    if (this.anon) return `player${this.id}`;
    return this.name;
  }
}
