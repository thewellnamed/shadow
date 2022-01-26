import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { IStatOptions, BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { SpellId } from 'src/app/logs/models/spell-id.enum';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { CooldownFields } from 'src/app/report/summary/fields/cooldown.fields';

export class MindBlastSummary extends BaseSummary {
  private summaryFields: SummaryFields;
  private cooldownFields: CooldownFields;
  private encounterFields: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryFields = new SummaryFields(this.analysis, this.highlight);
    this.cooldownFields = new CooldownFields(this.analysis, this.highlight);
    this.encounterFields = new EncounterFields(this.analysis, this.highlight);
  }

  report(options: IStatOptions = {}) {
    const stats = this.targetStats(this.analysis.report.getSpellStats(SpellId.MIND_BLAST), options);

    return this.summaryFields.fields(stats)
      .concat(this.cooldownFields.fields(stats))
      .concat(this.encounterFields.fields(stats));
  }
}
