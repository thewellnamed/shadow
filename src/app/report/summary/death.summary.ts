import { StatHighlights } from 'src/app/report/analysis/stat-highlights';
import { SummaryFields } from 'src/app/report/summary/fields/summary.fields';
import { BaseSummary } from 'src/app/report/summary/base.summary';
import { PlayerAnalysis } from 'src/app/report/models/player-analysis';
import { EncounterFields } from 'src/app/report/summary/fields/encounter.fields';
import { CooldownFields } from 'src/app/report/summary/fields/cooldown.fields';
import { CastStats } from 'src/app/report/models/cast-stats';

export class DeathSummary extends BaseSummary {
  private summaryFields: SummaryFields;
  private cooldownFields: CooldownFields;
  private encounterFields: EncounterFields;

  constructor(analysis: PlayerAnalysis, highlight: StatHighlights) {
    super(analysis, highlight);

    this.summaryFields = new SummaryFields(this.analysis, this.highlight);
    this.cooldownFields = new CooldownFields(this.analysis, this.highlight);
    this.encounterFields = new EncounterFields(this.analysis, this.highlight);
  }

  report(stats: CastStats) {
    return this.summaryFields.fields(stats)
      .concat(this.cooldownFields.fields(stats))
      .concat(this.encounterFields.fields(stats));
  }
}
