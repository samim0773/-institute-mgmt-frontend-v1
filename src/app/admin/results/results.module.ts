import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular Material
import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatSelectModule }          from '@angular/material/select';
import { MatTableModule }           from '@angular/material/table';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDividerModule }         from '@angular/material/divider';
import { MatChipsModule }           from '@angular/material/chips';
import { MatPaginatorModule }       from '@angular/material/paginator';

// Components
import { ResultListComponent }      from './result-list.component';
import { ResultMarksheetComponent } from './result-marksheet.component';

const routes: Routes = [
  { path: '',                             component: ResultListComponent,      title: 'Results'         },
  { path: ':studentId/:examId',           component: ResultMarksheetComponent, title: 'Print Marksheet' },
  { path: ':studentId/:examId/marksheet', component: ResultMarksheetComponent, title: 'Print Marksheet' },
];

@NgModule({
  declarations: [
    ResultListComponent,
    ResultMarksheetComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule,
    MatTableModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDividerModule, MatChipsModule, MatPaginatorModule,
  ],
})
export class ResultsModule {}
