import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CastsComponent } from 'src/app/report/components/casts.component';
import { ReportDetailsComponent } from 'src/app/report/components/report-details.component';
import { ReportWrapperComponent } from 'src/app/report/report-wrapper.component';
import { SettingsComponent } from 'src/app/report/components/settings.component';
import { SettingsHintComponent } from 'src/app/report/components/settings-hint.component';
import { SummaryComponent } from 'src/app/report/components/summary.component';

@NgModule({
  declarations: [
    CastsComponent,
    ReportDetailsComponent,
    ReportWrapperComponent,
    SettingsComponent,
    SettingsHintComponent,
    SummaryComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
    ReactiveFormsModule
  ]
})
export class ReportModule { }
