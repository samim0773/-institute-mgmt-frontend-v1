import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule }         from '@angular/common';
import { ReactiveFormsModule }  from '@angular/forms';

// Angular Material
import { MatCardModule }            from '@angular/material/card';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Components
import { LoginComponent }        from './login/login.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

// Guards
import { LoginRedirectGuard } from '../core/guards/login-redirect.guard';

const routes: Routes = [
  {
    path:         'login',
    component:    LoginComponent,
    canActivate:  [LoginRedirectGuard],  // redirect away if already logged in
    title:        'Sign In — Institute Management',
  },
  {
    path:      'unauthorized',
    component: UnauthorizedComponent,
    title:     'Access Denied',
  },
  {
    path:       '',
    redirectTo: 'login',
    pathMatch:  'full',
  },
];

@NgModule({
  declarations: [
    LoginComponent,
    UnauthorizedComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),

    // Material modules needed by auth components
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class AuthModule {}
