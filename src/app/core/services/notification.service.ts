// src/app/core/services/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timeout: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  constructor() {}

  // Show a success notification
  success(message: string, timeout = 5000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'success',
      message,
      timeout
    });
    
    // Also log to console for development
    console.log(`Success: ${message}`);
  }

  // Show an error notification
  error(message: string, timeout = 7000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'error',
      message,
      timeout
    });
    
    // Also log to console for development
    console.error(`Error: ${message}`);
  }

  // Show an info notification
  info(message: string, timeout = 5000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'info',
      message,
      timeout
    });
    
    // Also log to console for development
    console.info(`Info: ${message}`);
  }

  // Show a warning notification
  warning(message: string, timeout = 6000): void {
    this.addNotification({
      id: this.generateId(),
      type: 'warning',
      message,
      timeout
    });
    
    // Also log to console for development
    console.warn(`Warning: ${message}`);
  }

  // Remove a notification by ID
  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next(
      currentNotifications.filter(notification => notification.id !== id)
    );
  }

  // Clear all notifications
  clearAll(): void {
    this.notificationsSubject.next([]);
  }

  // Add a notification and handle its timeout
  private addNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, notification]);

    // Remove the notification after timeout
    if (notification.timeout > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.timeout);
    }
  }

  // Generate a unique ID for notifications
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}