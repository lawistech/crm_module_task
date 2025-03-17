import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor() {}

  success(message: string) {
    console.log(`Success: ${message}`);
  }

  error(message: string) {
    console.error(`Error: ${message}`);
  }
}
