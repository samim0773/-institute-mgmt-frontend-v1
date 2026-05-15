import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

import { MatCardModule }            from '@angular/material/card';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatTableModule }           from '@angular/material/table';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';

import { SubjectsListComponent } from './subjects-list.component';
import { SubjectFormComponent }  from './subject-form.component';

const routes: Routes = [
  { path: '',         component: SubjectsListComponent, title: 'Subjects'          },
  { path: 'new',      component: SubjectFormComponent,  title: 'Assign Subject'    },
  { path: ':id/edit', component: SubjectFormComponent,  title: 'Edit Subject'      },
];

@NgModule({
  declarations: [
    SubjectsListComponent,
    SubjectFormComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
})
export class SubjectsModule {}
