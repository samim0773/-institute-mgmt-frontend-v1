import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { CoreModule }       from './core/core.module';
import { AppComponent }     from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,   // required for Angular Material animations
    CoreModule,                // interceptors, HttpClient, guards
    AppRoutingModule,          // lazy-loaded routes
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
