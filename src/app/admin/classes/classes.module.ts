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

import { ClassesListComponent } from './classes-list.component';
import { ClassFormComponent }   from './class-form.component';

const routes: Routes = [
  { path: '',         component: ClassesListComponent, title: 'Classes'    },
  { path: 'new',      component: ClassFormComponent,   title: 'Add Class'  },
  { path: ':id/edit', component: ClassFormComponent,   title: 'Edit Class' },
];

@NgModule({
  declarations: [
    ClassesListComponent,
    ClassFormComponent,
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
export class ClassesModule {}
