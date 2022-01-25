import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { IStatOptions, BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { CooldownFields } from 'src/app/report/summary/fields/cooldown.fields';

export class MindBlastTabStats extends BaseSummary {
  private summaryStats: SummaryFields;
  private cooldownStats: CooldownFields;
  private encounterStats: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryFields(this.analysis, this.highlight);
    this.cooldownStats = new CooldownFields(this.analysis, this.highlight);
    this.encounterStats = new EncounterFields(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.report.stats, options);

    return this.summaryStats.fields(stats, SpellId.MIND_BLAST)
      .concat(this.cooldownStats.fields(stats, SpellId.MIND_BLAST))
      .concat(this.encounterStats.fields(stats, SpellId.MIND_BLAST));
  }
}
