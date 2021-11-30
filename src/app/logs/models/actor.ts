import { IActorData } from 'src/app/logs/logs.service';

export class Actor {
  id: number;
  name: string;
  type: string;
  pet: boolean;
  owner: number|undefined;
  friendly: boolean;
  encounterIds: number[];
  shadowFiendId: number;

  constructor(data: IActorData, friendly: boolean) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.pet = data.petOwner !== undefined;
    this.owner = data.petOwner;
    this.friendly = friendly;
    this.encounterIds = data.fights.map((f) => f.id);
  }
}
