import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from "src/app/home.component";
import { ReportDetailsComponent } from 'src/app/report/components/report-details.component';
import { ReportWrapperComponent } from 'src/app/report/report-wrapper.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'report/:logId',
    component: ReportWrapperComponent,
    children: [
      {
        path: ':player',
        component: ReportDetailsComponent
      },
      {
        path: ':player/:encounterId',
        component: ReportDetailsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
