import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { BaseStats } from 'src/app/report/stats/base.stats';

export enum Tab {
  Timeline = 0,
  VT,
  SWP,
  MB,
  Death,
  Flay
}

export const TabDefinitions: ITabDefinition[] = [
  // Tab.Timeline
  {
    label: 'Timeline',
    spellId: SpellId.NONE
  },

  // Tab.VT
  {
    label: 'VT',
    icon: 'vt',
    spellId: SpellId.VAMPIRIC_TOUCH
  },

  // Tab.SWP
  {
    label: 'SW:P',
    icon: 'swp',
    spellId: SpellId.PAIN
  },

  // Tab.MB
  {
    label: 'MB',
    icon: 'mb',
    spellId: SpellId.MIND_BLAST
  },

  // Tab.Death
  {
    label: 'SW:D',
    icon: 'swd',
    spellId: SpellId.DEATH
  },

  // Tab.Flay
  {
    label: 'MF',
    icon: 'flay',
    spellId: SpellId.MIND_FLAY
  }
];

export interface ITabDefinition {
  label: string;
  spellId: SpellId;
  icon?: string;
  stats?: Constructor<BaseStats>
}
