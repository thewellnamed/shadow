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
  type: 'combatantinfo' | 'cast' | 'begincast' | 'damage' | 'death' | 'applybuff' | 'removebuff' | 'refreshbuff' | 'applydebuff' | 'applydebuffstack' | 'removedebuff' | 'refreshdebuff';
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
  hitPoints: number;
  maxHitPoints: number;
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

export interface IDebuffData extends IEventData {
  type: 'applydebuff' | 'removedebuff' | 'refreshdebuff' | 'applydebuffstack'
}

export interface ICombatantData extends IEventData {
  type: 'combatantinfo';
  faction: number;
  intellect: number;
  spirit: number;
  stamina: number;
  critSpell: number;
  hasteSpell: number;
  hitSpell: number;
  gear: ICombatantItem[];
  auras: ICombatantAura[];
}

export interface ICombatantAura {
  source: number;
  ability: number;
  name: string;
  stacks: number;
}

export interface ICombatantItem {
  id: number;
  permanentEnchant?: number;
  gems?: { id: number }[];
}

export interface IActorStats {
  Agility?: IStatValue;
  Crit?: IStatValue;
  Expertise?: IStatValue;
  Haste?: IStatValue;
  Hit?: IStatValue;
  Intellect?: IStatValue;
  Spirit?: IStatValue;
  Stamina?: IStatValue;
  Strength?: IStatValue;
}

export interface IActorItem {
  id: number;
  slot: number;
  name: string;
}

export interface IStatValue {
  min: number;
  max: number;
}
