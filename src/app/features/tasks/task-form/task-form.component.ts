// src/app/features/tasks/task-form/task-form.component.ts
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface UploadedFile {
  id?: string;
  file: File;
  name: string;
  type: string;
  size: number;
  progress: number;
  uploaded?: boolean;
  url?: string;
}

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
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  taskForm!: FormGroup;
  isSubmitting = false;
  tagInput = new FormControl('');
  tags: string[] = [];
  uploadedFiles: UploadedFile[] = [];
  isDragging = false;
  
  // Multi-step form
  formSteps = ['Basic Info', 'Details', 'Attachments'];
  currentStep = 0;
  
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
      this.loadTaskAttachments();
    }
  }
  
  // Getter for easy access to form fields
  get f() { 
    return this.taskForm.controls; 
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
  
  private async loadTaskAttachments(): Promise<void> {
    if (!this.task || !this.task.id) {
      return;
    }
    
    try {
      const files = await firstValueFrom(this.fileUploadService.getFilesByTaskId(this.task.id));
      
      // Convert existing attachments to the UploadedFile format
      this.uploadedFiles = files.map(fileData => ({
        id: fileData.id,
        file: new File([], fileData.name, { type: fileData.contentType }),
        name: fileData.name,
        type: fileData.contentType,
        size: fileData.size,
        progress: 100,
        uploaded: true,
        url: fileData.url
      }));
    } catch (error) {
      console.error('Failed to load task attachments:', error);
      this.notificationService.error('Failed to load task attachments');
    }
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
  
  // File Management
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(files);
    }
  }
  
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    
    if (files) {
      this.processFiles(files);
    }
  }
  
  processFiles(files: FileList): void {
    Array.from(files).forEach(file => {
      // Check if file already exists
      const exists = this.uploadedFiles.some(f => f.name === file.name && f.size === file.size);
      if (exists) {
        this.notificationService.error(`File ${file.name} already added`);
        return;
      }
      
      // Add file to list with 0% progress
      const uploadedFile: UploadedFile = {
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        progress: 0
      };
      
      this.uploadedFiles.push(uploadedFile);
      
      // Start tracking progress
      const fileIndex = this.uploadedFiles.length - 1;
      
      // If task already exists, upload the file immediately and associate with task
      if (this.task && this.task.id) {
        this.uploadFileWithProgress(fileIndex, this.task.id);
      } else {
        // Otherwise just track it, it will be uploaded when the task is created
        // Just show the progress for now
        this.simulateFileUploadProgress(fileIndex);
      }
    });
    
    // Reset the file input so the same file can be selected again
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
  
  // Upload a file and track its progress
  uploadFileWithProgress(fileIndex: number, taskId: string): void {
    const uploadedFile = this.uploadedFiles[fileIndex];
    if (!uploadedFile || uploadedFile.uploaded) return;
    
    console.log('Starting upload for file:', uploadedFile.name);
    
    // Use the FileUploadService with progress tracking
    this.fileUploadService.uploadFile(uploadedFile.file, taskId)
      .subscribe({
        next: (fileId) => {
          console.log('Upload successful, fileId:', fileId);
          
          // Update the file with the id from the server and mark as uploaded
          this.uploadedFiles[fileIndex].id = fileId;
          this.uploadedFiles[fileIndex].uploaded = true;
          this.uploadedFiles[fileIndex].progress = 100; // Set to 100% when complete
          
          // Get the URL for the uploaded file
          this.fileUploadService.getFilesByTaskId(taskId).subscribe(files => {
            const uploadedFileDetails = files.find(f => f.id === fileId);
            if (uploadedFileDetails) {
              this.uploadedFiles[fileIndex].url = uploadedFileDetails.url;
            }
          });
          
          this.notificationService.success(`File ${uploadedFile.name} uploaded successfully`);
        },
        error: (error) => {
          console.error('Error uploading file:', error);
          this.notificationService.error(`Failed to upload file ${uploadedFile.name}`);
          // Keep the file in the list but indicate upload error
          this.uploadedFiles[fileIndex].progress = 0;
        }
      });
  }
  
  // This simulates progress until real progress tracking is implemented
  simulateFileUploadProgress(fileIndex: number): void {
    let progress = 0;
    const interval = setInterval(() => {
      // Stop if the file is no longer in the array
      if (!this.uploadedFiles[fileIndex]) {
        clearInterval(interval);
        return;
      }
      
      // Stop if progress reaches 90% (the final 10% would be the server confirming the upload)
      if (progress >= 90 || this.uploadedFiles[fileIndex].progress >= 100) {
        clearInterval(interval);
        return;
      }
      
      // Increment progress by random amount
      progress += Math.floor(Math.random() * 10) + 5;
      progress = Math.min(progress, 90);
      
      // Update the progress display
      this.uploadedFiles[fileIndex].progress = progress;
    }, 500);
  }
  
  removeFile(index: number): void {
    const file = this.uploadedFiles[index];
    
    // If file has already been uploaded and has an ID, also delete from storage
    if (file.id) {
      this.fileUploadService.deleteFile(file.id).subscribe({
        next: () => {
          this.uploadedFiles.splice(index, 1);
          this.notificationService.success('File removed successfully');
        },
        error: (error) => {
          console.error('Error removing file:', error);
          this.notificationService.error('Failed to remove file');
        }
      });
    } else {
      // File was just added but not uploaded yet
      this.uploadedFiles.splice(index, 1);
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Navigation methods for multi-step form
  nextStep(): void {
    if (this.currentStep < this.formSteps.length - 1 && !this.isStepInvalid()) {
      this.currentStep++;
    }
  }
  
  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }
  
  isStepInvalid(): boolean {
    if (this.currentStep === 0) {
      return this.taskForm.get('title')?.invalid || false;
    }
    return false;
  }

  async onSubmit(): Promise<void> {
    if (this.taskForm.invalid || this.isSubmitting) {
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.taskForm.value;
    
    // Basic task data
    const taskData = {
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      priority: formValue.priority,
      dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
      tags: this.tags,
      attachments: this.uploadedFiles
        .filter(file => file.uploaded && file.id)
        .map(file => file.id as string)
    };
    
    try {
      let taskResult: Task;
      
      if (this.task) {
        // Update existing task
        const updatedTask = { ...this.task, ...taskData };
        taskResult = await firstValueFrom(this.taskService.updateTask(updatedTask));
      } else {
        // Create new task
        taskResult = await firstValueFrom(this.taskService.createTask(taskData));
      }
      
      // Upload any files that haven't been uploaded yet
      const newFileUploads = this.uploadedFiles
        .filter(file => !file.uploaded)
        .map(file => {
          return this.fileUploadService.uploadFile(file.file, taskResult.id)
            .pipe(
              catchError(error => {
                console.error(`Error uploading file ${file.name}:`, error);
                return of(null); // Return observable that emits null so forkJoin doesn't fail
              })
            );
        });
      
      if (newFileUploads.length > 0) {
        await firstValueFrom(forkJoin(newFileUploads));
        
        // Update task attachments
        if (taskResult.attachments) {
          const allAttachmentIds = [...taskResult.attachments];
          
          // Get fileIds that were just uploaded
          const fileIds = await firstValueFrom(this.fileUploadService.getFilesByTaskId(taskResult.id))
            .then(files => files.map(file => file.id));
          
          // Combine all attachment IDs
          taskResult.attachments = [...new Set([...allAttachmentIds, ...fileIds])];
          
          // Update the task with all attachment IDs
          await firstValueFrom(this.taskService.updateTask(taskResult));
        }
      }
      
      this.taskSaved.emit(taskResult);
      this.notificationService.success(`Task ${this.task ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving task:', error);
      this.notificationService.error(`Failed to ${this.task ? 'update' : 'create'} task`);
    } finally {
      this.isSubmitting = false;
    }
  }
  
  cancel(): void {
    this.closeForm.emit();
  }
}