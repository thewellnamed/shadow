import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { DotFields } from 'src/app/report/summary/fields/dot.fields';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { IStatOptions, BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';

export class PainSummary extends BaseSummary {
  private summaryStats: SummaryFields;
  private dotStats: DotFields;
  private encounterStats: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryStats = new SummaryFields(this.analysis, this.highlight);
    this.dotStats = new DotFields(this.analysis, this.highlight);
    this.encounterStats = new EncounterFields(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.report.getSpellStats(SpellId.PAIN), options);

    return this.summaryStats.fields(stats)
      .concat(this.dotStats.fields(stats))
      .concat(this.encounterStats.fields(stats));
  }
}
