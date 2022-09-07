import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { TimelineSummary } from 'src/app/report/summary/timeline.summary';
import { BaseSummary } from 'src/app/report/summary/base.summary';
import { DevouringPlagueSummary } from 'src/app/report/summary/devouring-plague.summary';
import { VampiricTouchSummary } from 'src/app/report/summary/vampiric-touch.summary';
import { PainSummary } from 'src/app/report/summary/pain.summary';
import { MindFlaySummary } from 'src/app/report/summary/mind-flay.summary';
import { DeathSummary } from 'src/app/report/summary/death.summary';
import { MindBlastSummary } from 'src/app/report/summary/mind-blast.summary';

export enum Tab {
  Timeline = 0,
  DP,
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
    spellId: SpellId.NONE,
    summaryType: TimelineSummary
  },

  // Tab.DP
  {
    label: 'DP',
    icon: 'dp',
    spellId: SpellId.DEVOURING_PLAGUE,
    summaryType: DevouringPlagueSummary
  },

  // Tab.VT
  {
    label: 'VT',
    icon: 'vt',
    spellId: SpellId.VAMPIRIC_TOUCH,
    summaryType: VampiricTouchSummary
  },

  // Tab.SWP
  {
    label: 'SW:P',
    icon: 'swp',
    spellId: SpellId.PAIN,
    summaryType: PainSummary
  },

  // Tab.MB
  {
    label: 'MB',
    icon: 'mb',
    spellId: SpellId.MIND_BLAST,
    summaryType: MindBlastSummary
  },

  // Tab.Death
  {
    label: 'SW:D',
    icon: 'swd',
    spellId: SpellId.DEATH,
    summaryType: DeathSummary
  },

  // Tab.Flay
  {
    label: 'MF',
    icon: 'flay',
    spellId: SpellId.MIND_FLAY,
    summaryType: MindFlaySummary
  }
];

export interface ITabDefinition {
  label: string;
  spellId: SpellId;
  icon?: string;
  summaryType: Constructor<BaseSummary>;
}
