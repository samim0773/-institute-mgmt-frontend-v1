import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard }          from './core/guards/auth.guard';
import { RoleGuard }          from './core/guards/role.guard';
import { LoginRedirectGuard } from './core/guards/login-redirect.guard';
import { LandingComponent }   from './public/landing/landing.component';
import { RegisterComponent }  from './public/register/register.component';

const routes: Routes = [
  { path: '', component: LandingComponent, pathMatch: 'full' },

  { path: 'register', component: RegisterComponent, canActivate: [LoginRedirectGuard] },

  {
    path: 'auth',
    canActivate: [LoginRedirectGuard],
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },

  {
    path: 'super-admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['super_admin'] },
    loadChildren: () => import('./super-admin/super-admin.module').then(m => m.SuperAdminModule),
  },

  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
  },

  {
    path: 'teacher',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['teacher'] },
    loadChildren: () => import('./teacher/teacher.module').then(m => m.TeacherModule),
  },

  {
    path: 'student',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['student'] },
    loadChildren: () => import('./student/student.module').then(m => m.StudentModule),
  },

  {
    path: 'unauthorized',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
