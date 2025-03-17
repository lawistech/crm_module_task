// src/app/features/tasks/task-form/task-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FileUploadService, FileData } from '../../../core/services/file-upload.service';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  @Input() task: Task | null = null;
  @Output() taskSaved = new EventEmitter<Task>();
  @Output() closeForm = new EventEmitter<void>();
  
  taskForm!: FormGroup;
  isSubmitting = false;
  tagInput = new FormControl('');
  tags: string[] = [];
  
  // File Upload Properties
  selectedFile: File | null = null;
  isUploading = false;
  attachments: FileData[] = [];
  attachmentIds: string[] = [];
  
  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fileUploadService: FileUploadService
  ) { }

  ngOnInit(): void {
    this.initForm();
    
    if (this.task) {
      this.patchFormWithTaskData();
      this.loadAttachments();
    }
  }
  
  private initForm(): void {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      status: ['todo', Validators.required],
      priority: ['medium', Validators.required],
      dueDate: ['']
    });
  }
  
  private patchFormWithTaskData(): void {
    if (!this.task) return;
    
    this.taskForm.patchValue({
      title: this.task.title,
      description: this.task.description,
      status: this.task.status,
      priority: this.task.priority,
      dueDate: this.task.dueDate ? this.formatDateForInput(this.task.dueDate) : '',
    });
    
    // Set tags
    this.tags = this.task.tags || [];
    
    // Set attachment IDs
    this.attachmentIds = this.task.attachments || [];
  }
  
  private loadAttachments(): void {
    if (!this.task || !this.task.id) return;
    
    // Load attachments based on task ID
    this.fileUploadService.getFilesByTaskId(this.task.id).subscribe({
      next: (files) => {
        this.attachments = files;
      },
      error: (error: any) => {
        console.error('Error loading attachments:', error);
        this.notificationService.error('Failed to load attachments');
      }
    });
  }
  
  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
  }

  // Tag Management
  addTag(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    const tag = this.tagInput.value?.trim();
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
      this.tagInput.setValue('');
    }
  }
  
  removeTag(index: number): void {
    this.tags.splice(index, 1);
  }

  // File Methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }
  
  uploadFile(): void {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    
    this.fileUploadService.uploadFile(this.selectedFile).subscribe({
      next: (fileId) => {
        this.notificationService.success('File uploaded successfully');
        this.attachmentIds.push(fileId);
        
        // If we have a task ID, update the file record with task ID
        if (this.task && this.task.id) {
          // For brevity, manually update task attachments
          this.updateFileTaskAssociation(fileId, this.task.id);
        }
        
        // Clear the selected file
        this.selectedFile = null;
        
        // Reload attachments if we have a task ID
        if (this.task && this.task.id) {
          this.loadAttachments();
        }
      },
      error: (error: any) => {
        console.error('Error uploading file:', error);
        this.notificationService.error('Failed to upload file: ' + error.message);
      },
      complete: () => {
        this.isUploading = false;
      }
    });
  }
  
  // Temporary solution until FileUploadService is fully implemented
  private updateFileTaskAssociation(fileId: string, taskId: string): void {
    console.log(`Associating file ${fileId} with task ${taskId}`);
    // In a production app, this would call a service method to update the association
  }
  
  deleteFile(fileId: string): void {
    if (confirm('Are you sure you want to delete this file?')) {
      this.fileUploadService.deleteFile(fileId).subscribe({
        next: () => {
          this.notificationService.success('File deleted successfully');
          this.attachments = this.attachments.filter(file => file.id !== fileId);
          this.attachmentIds = this.attachmentIds.filter(id => id !== fileId);
        },
        error: (error: any) => {
          console.error('Error deleting file:', error);
          this.notificationService.error('Failed to delete file: ' + error.message);
        }
      });
    }
  }
  
  // Helper methods for file display
  isPDF(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pdf');
  }
  
  isImage(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '');
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onSubmit(): void {
    if (this.taskForm.invalid || this.isSubmitting) {
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.taskForm.value;
    
    const taskData = {
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      priority: formValue.priority,
      dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
      tags: this.tags,
      attachments: this.attachmentIds // Include attachment IDs in task data
    };
    
    // Create a new observable for the task operation
    let taskOperation: Observable<Task>;
    
    if (this.task) {
      // Update existing task
      const updatedTask = { ...this.task, ...taskData };
      taskOperation = this.taskService.updateTask(updatedTask);
    } else {
      // Create new task
      taskOperation = this.taskService.createTask(taskData);
    }
    
    taskOperation.pipe(
      // Once the task is saved, associate any uploaded files with the task
      map(savedTask => {
        if (this.attachmentIds.length > 0 && !this.task) {
          // If this is a new task, we need to associate the uploaded files with the task
          this.updateFilesTaskAssociation(this.attachmentIds, savedTask.id);
        }
        return savedTask;
      }),
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: (result) => {
        this.taskSaved.emit(result);
      },
      error: (error: any) => {
        console.error('Error saving task:', error);
        this.notificationService.error('Failed to save task: ' + error.message);
      }
    });
  }
  
  // Temporary solution until FileUploadService is fully implemented
  private updateFilesTaskAssociation(fileIds: string[], taskId: string): void {
    console.log(`Associating files ${fileIds.join(', ')} with task ${taskId}`);
    // In a production app, this would call a service method to update the associations
  }
  
  cancel(): void {
    this.closeForm.emit();
  }
  
  // Convenience getter for form controls
  get f() { return this.taskForm.controls; }
}