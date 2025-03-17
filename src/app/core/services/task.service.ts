// src/app/core/services/task.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { Task, TaskCreate } from '../models/task.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  createTask(task: TaskCreate): Observable<Task> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return throwError(() => new Error('User must be logged in to create tasks'));
    }
    
    const newTask = {
      ...task,
      created_by: currentUser.id,
    };

    return from(this.supabaseService.supabaseClient
      .from('tasks')
      .insert(this.formatTaskForDatabase(newTask))
      .select()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.formatTaskFromDatabase(response.data[0]);
      }),
      catchError(error => {
        this.notificationService.error(`Failed to create task: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  getTasks(): Observable<Task[]> {
    return from(this.supabaseService.supabaseClient
      .from('tasks')
      .select('*, contacts(*), calls(*)')
      .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data.map(task => this.formatTaskFromDatabase(task));
      }),
      catchError(error => {
        this.notificationService.error(`Failed to fetch tasks: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  getTaskById(id: string): Observable<Task> {
    return from(this.supabaseService.supabaseClient
      .from('tasks')
      .select('*, contacts(*), calls(*)')
      .eq('id', id)
      .single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.formatTaskFromDatabase(response.data);
      }),
      catchError(error => {
        this.notificationService.error(`Failed to fetch task: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  updateTask(task: Task): Observable<Task> {
    return from(this.supabaseService.supabaseClient
      .from('tasks')
      .update(this.formatTaskForDatabase(task))
      .eq('id', task.id)
      .select()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return this.formatTaskFromDatabase(response.data[0]);
      }),
      catchError(error => {
        this.notificationService.error(`Failed to update task: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  deleteTask(id: string): Observable<void> {
    return from(this.supabaseService.supabaseClient
      .from('tasks')
      .delete()
      .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return;
      }),
      catchError(error => {
        this.notificationService.error(`Failed to delete task: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  // Helper methods to convert between camelCase (TypeScript) and snake_case (PostgreSQL)
  private formatTaskForDatabase(task: any): any {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
      contact_id: task.contactId,
      call_id: task.callId,
      tags: task.tags,
      assigned_to: task.assignedTo,
      created_by: task.createdBy,
    };
  }

  private formatTaskFromDatabase(task: any): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date ? new Date(task.due_date) : undefined,
      tags: task.tags || [],
      createdBy: task.created_by,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at)
    };
  }
}