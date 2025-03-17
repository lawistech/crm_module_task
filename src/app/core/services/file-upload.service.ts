// src/app/core/services/file-upload.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, throwError, switchMap } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  contentType: string;
  taskId?: string;
  userId: string;
  createdAt: Date;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  // Generate a unique ID without using uuid library
  private generateUniqueId(): string {
    // Use a combination of timestamp and random numbers
    const timestamp = new Date().getTime();
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}`;
  }

  uploadFile(file: File, taskId?: string): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return throwError(() => new Error('User must be logged in to upload files'));
    }
    
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${this.generateUniqueId()}.${fileExt}`;
    const filePath = `task-attachments/${currentUser.id}/${fileName}`;
    
    // Upload to Supabase Storage
    return from(this.supabaseService.supabaseClient.storage
      .from('files')
      .upload(filePath, file)
    ).pipe(
      switchMap(response => {
        if (response.error) throw response.error;
        
        // After successful upload, create a record in the file_attachments table
        const fileData = {
          name: file.name,
          path: filePath,
          size: file.size,
          content_type: file.type,
          user_id: currentUser.id,
          task_id: taskId || null
        };
        
        return this.createFileRecord(fileData);
      }),
      catchError(error => {
        this.notificationService.error(`Failed to upload file: ${error.message}`);
        return throwError(() => error);
      })
    );
  }
  
  private createFileRecord(fileData: any): Observable<string> {
    return from(this.supabaseService.supabaseClient
      .from('file_attachments')
      .insert(fileData)
      .select('id')
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data[0].id;
      }),
      catchError(error => {
        this.notificationService.error(`Failed to create file record: ${error.message}`);
        return throwError(() => error);
      })
    );
  }
  
  getFilesByTaskId(taskId: string): Observable<FileData[]> {
    return from(this.supabaseService.supabaseClient
      .from('file_attachments')
      .select('*')
      .eq('task_id', taskId)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        
        // Add the download URL to each file
        return response.data.map(file => this.mapFileData(file));
      }),
      catchError(error => {
        this.notificationService.error(`Failed to fetch files: ${error.message}`);
        return throwError(() => error);
      })
    );
  }
  
  private mapFileData(file: any): FileData {
    // Generate download URL
    const { data } = this.supabaseService.supabaseClient.storage
      .from('files')
      .getPublicUrl(file.path);
    
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      contentType: file.content_type,
      taskId: file.task_id,
      userId: file.user_id,
      createdAt: new Date(file.created_at),
      url: data.publicUrl || ''
    };
  }
  
  deleteFile(fileId: string): Observable<void> {
    return from(this.supabaseService.supabaseClient
      .from('file_attachments')
      .select('path')
      .eq('id', fileId)
      .single()
    ).pipe(
      switchMap(response => {
        if (response.error) throw response.error;
        const filePath = response.data.path;
        
        // First delete from storage
        return from(this.supabaseService.supabaseClient.storage
          .from('files')
          .remove([filePath])
        ).pipe(
          switchMap(storageResponse => {
            if (storageResponse.error) throw storageResponse.error;
            
            // Then delete the record
            return from(this.supabaseService.supabaseClient
              .from('file_attachments')
              .delete()
              .eq('id', fileId)
            );
          })
        );
      }),
      map(response => {
        if (response.error) throw response.error;
        return;
      }),
      catchError(error => {
        this.notificationService.error(`Failed to delete file: ${error.message}`);
        return throwError(() => error);
      })
    );
  }
}