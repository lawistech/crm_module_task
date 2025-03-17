// src/app/features/tasks/task-form/task-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { Comment } from '../../../core/models/comment.model';
import { AuthService } from '../../../core/services/auth.service';
import { CommentService } from '../../../core/services/comment.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

interface Attachment {
  id?: string;
  name: string;
  type: string;
  size: number;
  file?: File; // For new uploads
  url?: string; // For existing files
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
  
  taskForm!: FormGroup;
  isSubmitting = false;
  tagInput = new FormControl('');
  commentInput = new FormControl('');
  tags: string[] = [];
  comments: Comment[] = [];
  attachments: Attachment[] = [];
  
  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private authService: AuthService,
    private commentService: CommentService,
    private fileUploadService: FileUploadService
  ) { }

  ngOnInit(): void {
    this.initForm();
    
    if (this.task) {
      this.patchFormWithTaskData();
      this.loadTaskComments();
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
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        
        // Check file type
        if (this.isValidFileType(file)) {
          this.attachments.push({
            name: file.name,
            type: file.type,
            size: file.size,
            file: file
          });
        }
      }
    }
  }
  
  isValidFileType(file: File): boolean {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    return validTypes.includes(file.type);
  }
  
  removeFile(index: number): void {
    this.attachments.splice(index, 1);
  }
  
  // Comment Management
  loadTaskComments(): void {
    if (!this.task) return;
    
    this.commentService.getCommentsByTaskId(this.task.id).subscribe({
      next: (comments) => {
        this.comments = comments;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }
  
  addComment(): void {
    if (!this.task || !this.commentInput.value?.trim()) return;
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;
    
    const newComment = {
      taskId: this.task.id,
      text: this.commentInput.value.trim(),
      userId: currentUser.id,
      user: currentUser.email // Just for display, the actual user info would be joined from the users table
    };
    
    this.commentService.createComment(newComment).subscribe({
      next: (comment) => {
        this.comments.push(comment);
        this.commentInput.setValue('');
      },
      error: (error) => {
        console.error('Error adding comment:', error);
      }
    });
  }
  
  deleteComment(commentId: string): void {
    this.commentService.deleteComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== commentId);
      },
      error: (error) => {
        console.error('Error deleting comment:', error);
      }
    });
  }
  
  isCurrentUserComment(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === comment.userId;
  }
  
  // Load existing attachments
  loadTaskAttachments(): void {
    if (!this.task || !this.task.attachments) return;
    
    this.fileUploadService.getFilesByTaskId(this.task.id).subscribe({
      next: (files) => {
        this.attachments = files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.contentType,
          size: file.size,
          url: file.url
        }));
      },
      error: (error) => {
        console.error('Error loading attachments:', error);
      }
    });
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
      tags: this.tags
    };
    
    // Handle file uploads first
    this.handleFileUploads().pipe(
      switchMap(fileIds => {
        // Add file IDs to task data if there are any uploads
        if (fileIds && fileIds.length > 0) {
          const existingAttachmentIds = this.attachments
            .filter(a => a.id)
            .map(a => a.id as string);
          
          // Combine existing attachment IDs with new ones
          taskData['attachmentIds'] = [...existingAttachmentIds, ...fileIds];
        }
        
        if (this.task) {
          // Update existing task
          const updatedTask = { ...this.task, ...taskData };
          return this.taskService.updateTask(updatedTask);
        } else {
          // Create new task
          return this.taskService.createTask(taskData);
        }
      })
    ).subscribe({
      next: (result) => {
        this.taskSaved.emit(result);
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error saving task:', error);
        this.isSubmitting = false;
      }
    });
  }
  
  handleFileUploads(): Observable<string[]> {
    // Filter only new files that need to be uploaded
    const filesToUpload = this.attachments.filter(a => a.file);
    
    if (filesToUpload.length === 0) {
      return of([]);
    }
    
    // For each file, create an upload observable
    const uploadObservables = filesToUpload.map(attachment => {
      return this.fileUploadService.uploadFile(attachment.file as File)
        .pipe(
          catchError(error => {
            console.error(`Error uploading file ${attachment.name}:`, error);
            return of(null); // Return null for failed uploads
          })
        );
    });
    
    // Execute all uploads in parallel and collect the results
    return forkJoin(uploadObservables).pipe(
      map(results => results.filter(fileId => fileId !== null) as string[])
    );
  }
  
  cancel(): void {
    this.closeForm.emit();
  }
  
  // Convenience getter for form controls
  get f() { return this.taskForm.controls; }
}