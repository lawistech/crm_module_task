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
      .select('*, profiles(*)')
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.formatCommentFromDatabase(response.data[0]);
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
        
        // Get all unique user IDs from comments
        const userIds = [...new Set(response.data.map(comment => comment.user_id))];
        
        if (userIds.length === 0) {
          return of(response.data.map(comment => this.formatCommentFromDatabase(comment)));
        }
        
        // Fetch user profiles separately
        return from(this.supabaseService.supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        ).pipe(
          map(profilesResponse => {
            if (profilesResponse.error) throw profilesResponse.error;
            
            // Create a lookup of profiles by ID
            const profileLookup = profilesResponse.data.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, any>);
            
            // Combine comment data with profile info
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
  
  // Update to accept profile as a parameter
  private formatCommentFromDatabase(data: any, profile?: any): Comment {
    return {
      id: data.id,
      taskId: data.task_id,
      userId: data.user_id,
      text: data.text,
      createdAt: new Date(data.created_at),
      user: profile ? (profile.full_name || profile.email) : 'Unknown'
    };
  }

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

}