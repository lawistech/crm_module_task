// src/app/features/tasks/task-form/task-form.component.ts
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { firstValueFrom } from 'rxjs';

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
    if (!this.task || !this.task.attachments || this.task.attachments.length === 0) {
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
      
      // Simulate upload progress - in a real app, you'd use your upload service
      this.simulateFileUpload(this.uploadedFiles.length - 1);
    });
    
    // Reset the file input so the same file can be selected again
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
  
  // This would be replaced by your actual file upload method
  simulateFileUpload(fileIndex: number): void {
    const interval = setInterval(() => {
      if (this.uploadedFiles[fileIndex].progress < 100) {
        this.uploadedFiles[fileIndex].progress += 10;
      } else {
        clearInterval(interval);
      }
    }, 300);
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
  
  // Quick date setter for better UX
  setDueDate(option: 'today' | 'tomorrow' | 'nextWeek'): void {
    const today = new Date();
    let date: Date;
    
    switch(option) {
      case 'today':
        date = today;
        break;
      case 'tomorrow':
        date = new Date(today);
        date.setDate(date.getDate() + 1);
        break;
      case 'nextWeek':
        date = new Date(today);
        date.setDate(date.getDate() + 7);
        break;
    }
    
    this.taskForm.patchValue({
      dueDate: this.formatDateForInput(date)
    });
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
    
    const taskData = {
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      priority: formValue.priority,
      dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
      tags: this.tags
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
      const filePromises = this.uploadedFiles
        .filter(file => !file.uploaded)
        .map(async (file) => {
          try {
            const fileId = await firstValueFrom(this.fileUploadService.uploadFile(file.file));
            
            // In a real app, you'd associate this file with the task
            // For example by updating the task with the new attachment
            return fileId;
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            throw error;
          }
        });
      
      await Promise.all(filePromises);
      
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