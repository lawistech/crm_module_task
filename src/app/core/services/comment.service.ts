// src/app/core/services/comment.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
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
      .select('*, profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data.map(comment => this.formatCommentFromDatabase(comment));
      }),
      catchError(error => {
        this.notificationService.error(`Failed to fetch comments: ${error.message}`);
        return throwError(() => error);
      })
    );
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

  // Helper method to convert from snake_case (database) to camelCase (TypeScript)
  private formatCommentFromDatabase(data: any): Comment {
    return {
      id: data.id,
      taskId: data.task_id,
      userId: data.user_id,
      text: data.text,
      createdAt: new Date(data.created_at),
      user: data.profiles ? data.profiles.full_name || data.profiles.email : 'Unknown'
    };
  }
}