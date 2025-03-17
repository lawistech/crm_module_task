// src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

// Function to initialize app settings
function initializeApp() {
  return () => {
    // Set default timezone to UK
    const defaultTimezone = 'Europe/London';
    console.log('App initialized with timezone:', defaultTimezone);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: () => 
        initializeApp(),
      deps: [],
      multi: true
    },
    importProvidersFrom(ReactiveFormsModule)
  ]
};
