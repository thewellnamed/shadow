import { SpellId } from 'src/app/logs/models/spell-id.enum';

export enum DamageType {
  NONE,
  DIRECT,
  DOT,
  CHANNEL
}

export const SpellData: {[spellId: number]: ISpellData} = {
  [SpellId.DEATH]: { damageType: DamageType.DIRECT, maxDamageInstances: 1, maxDuration: 0, cooldown: 12 },
  [SpellId.FADE]: { damageType: DamageType.NONE, maxDamageInstances: 0, maxDuration: 10, cooldown: 30 },
  [SpellId.FEAR_WARD]: { damageType: DamageType.NONE, maxDamageInstances: 0, maxDuration: 180, cooldown: 180 },
  [SpellId.MIND_BLAST]: { damageType: DamageType.DIRECT, maxDamageInstances: 1, maxDuration: 0, cooldown: 5.5 },
  [SpellId.MIND_FLAY]: { damageType: DamageType.CHANNEL, maxDamageInstances: 3, maxDuration: 3, cooldown: 0 },
  [SpellId.PAIN]: { damageType: DamageType.DOT, maxDamageInstances: 8, maxDuration: 24, cooldown: 0 },
  [SpellId.SHADOW_FIEND]: { damageType: DamageType.NONE, maxDamageInstances: 0, maxDuration: 15, cooldown: 300 },
  [SpellId.SHIELD]: { damageType: DamageType.NONE, maxDamageInstances: 0, maxDuration: 30, cooldown: 4 },
  [SpellId.VAMPIRIC_EMBRACE]: { damageType: DamageType.NONE, maxDamageInstances: 0, maxDuration: 60, cooldown: 10 },
  [SpellId.VAMPIRIC_TOUCH]: { damageType: DamageType.DOT, maxDamageInstances: 5, maxDuration: 15, cooldown: 0 }
}

export interface ISpellData {
  damageType: DamageType;
  maxDamageInstances: number;
  maxDuration: number;
  cooldown: number;
}
