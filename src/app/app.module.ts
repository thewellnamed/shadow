import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AppRoutingModule } from 'src/app/app-routing.module';
import { LogsModule } from 'src/app/logs/logs.module';
import { ReportModule } from 'src/app/report/report.module';
import { AppComponent } from 'src/app/app.component';
import { HomeComponent } from 'src/app/home.component';
import { EventService } from 'src/app/event.service';
import { ParamsService } from 'src/app/params.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    LogsModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
    ReportModule
  ],
  providers: [
    EventService,
    ParamsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
