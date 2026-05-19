import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent }  from './landing/landing.component';
import { RegisterComponent } from './register/register.component';
import { LoginRedirectGuard } from '../core/guards/login-redirect.guard';

const routes: Routes = [
  { path: '',        component: LandingComponent },
  {
    path:        'register',
    component:   RegisterComponent,
    canActivate: [LoginRedirectGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicRoutingModule {}
