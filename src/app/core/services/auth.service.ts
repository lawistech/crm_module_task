// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    // Initialize the user - with error handling for missing session
    this.loadUser().catch(error => {
      console.log('No active session found or error loading user:', error);
      // We can safely ignore the AuthSessionMissingError as it just means the user isn't logged in
      this.currentUserSubject.next(null);
    });

    // Set up auth state change listener
    this.supabaseService.supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.currentUserSubject.next(session.user);
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  async loadUser(): Promise<User | null> {
    try {
      const { data: { user } } = await this.supabaseService.supabaseClient.auth.getUser();
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      // Instead of logging the error directly, we'll throw it to be handled by the caller
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await this.supabaseService.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      // Update the current user
      this.currentUserSubject.next(data.user);
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Failed to sign in'
      };
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await this.supabaseService.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          // You can add additional user metadata here if needed
          data: {
            full_name: ''
          }
        }
      });

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        message: 'Registration successful! Please check your email for verification.'
      };
    } catch (error: any) {
      let message = 'Failed to sign up';
      if (error.message.includes('duplicate key value violates unique constraint')) {
        message = 'Email address already exists';
      } else if (error.message.includes('invalid email address')) {
        message = 'Invalid email address';
      } else if (error.message.includes('Password should be at least 6 characters')) {
        message = 'Password should be at least 6 characters';
      } else {
        message = error.message || 'Failed to sign up';
      }
      return { 
        success: false, 
        message: message
      };
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await this.supabaseService.supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: window.location.origin + '/reset-password'
        }
      );

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        message: 'Password reset link has been sent to your email'
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Failed to send password reset email'
      };
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await this.supabaseService.supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        message: 'Password updated successfully'
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Failed to update password'
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.supabaseService.supabaseClient.auth.signOut();
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.currentUser$.subscribe(user => {
        observer.next(!!user);
        observer.complete();
      });
    });
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
