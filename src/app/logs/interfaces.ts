/**
 * WarcraftLogs API response interfaces
 */

export interface IEncountersResponse {
  title: string;
  owner: string;
  friendlies: IActorData[];
  friendlyPets: IActorData[];
  fights: IEncounterData[];
  enemies: IActorData[];
  enemyPets: IActorData[];
}

export interface IEncounterData {
  id: number;
  name: string;
  start_time: number;
  end_time: number;
  durationSeconds: number;
  boss: number;
  originalBoss: number;
  kill?: boolean;
}

export interface IActorData {
  id: number;
  name: string;
  icon: string;
  type: string;
  petOwner?: number;
  fights: { id: number }[];
}

export interface IEventsResponse {
  events: IEventData[];
  count: number;
  nextPageTimestamp?: number;
}

export interface IAbilityData {
  name: string;
  guid: number;
}

export interface IEventData {
  type: 'cast' | 'begincast' | 'damage' | 'death' | 'applybuff' | 'removebuff' | 'refreshbuff';
  ability: IAbilityData;
  timestamp: number;
  targetID: number;
  targetInstance: number;
  read: boolean;
}

export interface ICastData extends IEventData {
  type: 'cast' | 'begincast';
  sourceID: number;
  spellPower: number;
}

export interface IDamageData extends IEventData {
  type: 'damage';
  sourceID: number;
  amount: number;
  hitType: number;
  absorbed?: number;
  resisted?: number;
  tick: boolean;
}

export interface IDeathData extends IEventData {
  type: 'death';
}

export interface IBuffData extends IEventData {
  type: 'applybuff' | 'removebuff' | 'refreshbuff';
}

// leaving partial for now on purpose
export interface IActorSummaryResponse {
  combatantInfo: ICombatantInfo;
}

export interface ICombatantInfo {
  stats: IActorStats;
}

export interface IActorStats {
  Agility: IStatValue;
  Crit: IStatValue;
  Expertise: IStatValue;
  Haste: IStatValue;
  Hit: IStatValue;
  Intellect: IStatValue;
  Spirit: IStatValue;
  Stamina: IStatValue;
  Strength: IStatValue;
}

export interface IStatValue {
  min: number;
  max: number;
}
