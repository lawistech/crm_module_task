// src/app/core/services/file-upload.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
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
    console.log('Starting file upload to Supabase:', file.name);
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return throwError(() => new Error('User must be logged in to upload files'));
    }
    
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${this.generateUniqueId()}.${fileExt}`;
    const filePath = `task-attachments/${currentUser.id}/${fileName}`;
    
    console.log('Generated file path:', filePath);
    
    // First check if we can read the file
    return from(this.readFileAsArrayBuffer(file)).pipe(
      switchMap(fileBuffer => {
        console.log('File read successfully, uploading to Supabase Storage...');
        // Upload to Supabase Storage
        return from(this.supabaseService.supabaseClient.storage
          .from('files')
          .upload(filePath, fileBuffer, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600'
          })
        );
      }),
      switchMap(response => {
        console.log('Supabase upload response:', response);
        if (response.error) {
          console.error('Upload error from Supabase:', response.error);
          this.notificationService.error(`Upload failed: ${response.error.message}`);
          return throwError(() => response.error);
        }
        
        // After successful upload, create a record in the file_attachments table
        const fileData = {
          name: file.name,
          path: filePath,
          size: file.size,
          content_type: file.type || 'application/octet-stream',
          user_id: currentUser.id,
          task_id: taskId || null
        };
        
        console.log('Creating file record in database:', fileData);
        
        return this.createFileRecord(fileData);
      }),
      catchError(error => {
        console.error('Error in file upload process:', error);
        this.notificationService.error(`Failed to upload file: ${error.message || 'Unknown error'}`);
        return throwError(() => error);
      })
    );
  }
  
  // Convert File to ArrayBuffer for Supabase upload
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = error => reject(error);
      reader.readAsArrayBuffer(file);
    });
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