import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular Material
import { MatTableModule }           from '@angular/material/table';
import { MatPaginatorModule }       from '@angular/material/paginator';
import { MatSortModule }            from '@angular/material/sort';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatCardModule }            from '@angular/material/card';
import { MatChipsModule }           from '@angular/material/chips';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDividerModule }         from '@angular/material/divider';
import { MatTabsModule }            from '@angular/material/tabs';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';

// Components
import { StudentsListComponent }  from './students-list.component';
import { StudentFormComponent }   from './student-form.component';
import { StudentDetailComponent } from './student-detail.component';

const routes: Routes = [
  { path: '',         component: StudentsListComponent,  title: 'Students'       },
  { path: 'new',      component: StudentFormComponent,   title: 'Add Student'    },
  { path: ':id',      component: StudentDetailComponent, title: 'Student Detail' },
  { path: ':id/edit', component: StudentFormComponent,   title: 'Edit Student'   },
];

@NgModule({
  declarations: [
    StudentsListComponent,
    StudentFormComponent,
    StudentDetailComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDividerModule, MatTabsModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
})
export class StudentsModule {}
