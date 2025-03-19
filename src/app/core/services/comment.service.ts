// src/app/core/services/comment.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, switchMap, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { Comment } from '../models/comment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}


  deleteComment(commentId: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return throwError(() => new Error('User must be logged in to delete comments'));
    }
  
    return from(this.supabaseService.supabaseClient
      .from('task_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUser.id) // Ensure user can only delete their own comments
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return;
      }),
      catchError(error => {
        this.notificationService.error(`Failed to delete comment: ${error.message}`);
        return throwError(() => error);
      })
    );
  }







    // In your comment.service.ts file

  createComment(commentData: Partial<Comment>): Observable<Comment> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return throwError(() => new Error('User must be logged in to create comments'));
    }
    
    const newComment = {
      task_id: commentData.taskId,
      text: commentData.text,
      user_id: currentUser.id
    };

    return from(this.supabaseService.supabaseClient
      .from('task_comments')
      .insert(newComment)
      .select('*')
    ).pipe(
      switchMap(response => {
        if (response.error) throw response.error;
        
        // Now fetch the profile separately
        return from(this.supabaseService.supabaseClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', currentUser.id)
          .single()
        ).pipe(
          map(profileResponse => {
            if (profileResponse.error) {
              // If profile fetch fails, still return the comment
              return this.formatCommentFromDatabase(response.data[0]);
            }
            
            // Return comment with profile data
            return this.formatCommentFromDatabase(
              response.data[0], 
              profileResponse.data
            );
          })
        );
      }),
      catchError(error => {
        this.notificationService.error(`Failed to add comment: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  getCommentsByTaskId(taskId: string): Observable<Comment[]> {
    return from(this.supabaseService.supabaseClient
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    ).pipe(
      switchMap(response => {
        if (response.error) throw response.error;
        
        if (response.data.length === 0) {
          return of([]);
        }
        
        // Get all unique user IDs from comments
        const userIds = [...new Set(response.data.map(comment => comment.user_id))];
        
        // Fetch user profiles separately with explicit column selection
        return from(this.supabaseService.supabaseClient
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
        ).pipe(
          map(profilesResponse => {
            // Define type for profile lookup
            const profileLookup: Record<string, any> = {};
            
            if (!profilesResponse.error) {
              // Create a lookup of profiles by ID
              profilesResponse.data.forEach(profile => {
                profileLookup[profile.id] = profile;
              });
            }
            
            // Map comments with profile data
            return response.data.map(comment => {
              const profile = profileLookup[comment.user_id];
              return this.formatCommentFromDatabase(comment, profile);
            });
          })
        );
      }),
      catchError(error => {
        this.notificationService.error(`Failed to fetch comments: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  // Updated formatting method with fallbacks
  private formatCommentFromDatabase(data: any, profile?: any): Comment {
    return {
      id: data.id,
      taskId: data.task_id,
      userId: data.user_id,
      text: data.text,
      createdAt: new Date(data.created_at),
      user: profile ? (profile.full_name || profile.email || 'Unknown User') : 'Unknown User'
    };
  }

}