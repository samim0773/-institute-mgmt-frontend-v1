import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular Material
import { MatTableModule }           from '@angular/material/table';
import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatChipsModule }           from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDividerModule }         from '@angular/material/divider';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';

// Pipes
import { ReplacePipe } from './replace.pipe';

// Components
import { ExamListComponent }        from './exam-list.component';
import { ExamFormComponent }        from './exam-form.component';
import { AdmitCardComponent }       from './admit-card.component';
import { AdmitCardPrintComponent }  from './admit-card-print.component';

const routes: Routes = [
  { path: '',                          component: ExamListComponent,       title: 'Exams'       },
  { path: 'new',                       component: ExamFormComponent,       title: 'Create Exam' },
  { path: ':id/edit',                  component: ExamFormComponent,       title: 'Edit Exam'   },
  { path: ':examId/admit-cards',       component: ExamListComponent,       title: 'Admit Cards' },
  {
    path:      ':examId/admit-cards/:studentId',
    component: AdmitCardComponent,
    title:     'Print Admit Card',
  },
];

@NgModule({
  declarations: [
    ExamListComponent,
    ExamFormComponent,
    AdmitCardComponent,
    AdmitCardPrintComponent,
    ReplacePipe,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatTableModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatProgressSpinnerModule, MatProgressBarModule,
    MatTooltipModule, MatDividerModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
})
export class ExamsModule {}
