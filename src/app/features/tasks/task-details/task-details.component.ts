// src/app/features/tasks/task-details/task-details.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../core/models/task.model';
import { FileUploadService, FileData } from '../../../core/services/file-upload.service';
import { CommentService } from '../../../core/services/comment.service';
import { Comment } from '../../../core/models/comment.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.scss']
})
export class TaskDetailsComponent implements OnInit {
  @Input() task: Task | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() editTask = new EventEmitter<Task>();
  
  attachments: FileData[] = [];
  comments: Comment[] = [];
  commentForm!: FormGroup;
  isLoadingAttachments = false;
  isLoadingComments = false;
  isSubmittingComment = false;
  activeTab: 'details' | 'comments' | 'attachments' = 'details';

  constructor(
    private fileUploadService: FileUploadService,
    private commentService: CommentService,
    private fb: FormBuilder,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initCommentForm();
    
    if (this.task) {
      this.loadTaskAttachments();
      this.loadTaskComments();
    }
  }
  
  private initCommentForm(): void {
    this.commentForm = this.fb.group({
      text: ['', Validators.required]
    });
  }
  
  private async loadTaskAttachments(): Promise<void> {
    if (!this.task) return;
    
    this.isLoadingAttachments = true;
    try {
      this.attachments = await firstValueFrom(this.fileUploadService.getFilesByTaskId(this.task.id));
    } catch (error) {
      console.error('Failed to load task attachments:', error);
    } finally {
      this.isLoadingAttachments = false;
    }
  }
  
  private async loadTaskComments(): Promise<void> {
    if (!this.task) return;
    
    this.isLoadingComments = true;
    try {
      this.comments = await firstValueFrom(this.commentService.getCommentsByTaskId(this.task.id));
    } catch (error) {
      console.error('Failed to load task comments:', error);
    } finally {
      this.isLoadingComments = false;
    }
  }
  
  async submitComment(): Promise<void> {
    if (this.commentForm.invalid || !this.task || this.isSubmittingComment) return;
    
    this.isSubmittingComment = true;
    
    try {
      const newComment = await firstValueFrom(this.commentService.createComment({
        taskId: this.task.id,
        text: this.commentForm.value.text
      }));
      
      // Add new comment to the list
      this.comments = [newComment, ...this.comments];
      
      // Reset form
      this.commentForm.reset();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      this.isSubmittingComment = false;
    }
  }
  
  deleteComment(commentId: string, index: number): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.commentService.deleteComment(commentId).subscribe({
        next: () => {
          this.comments.splice(index, 1);
        },
        error: (error) => {
          console.error('Failed to delete comment:', error);
        }
      });
    }
  }
  
  onClose(): void {
    this.close.emit();
  }
  
  onEdit(): void {
    if (this.task) {
      this.editTask.emit(this.task);
    }
  }
  
  setActiveTab(tab: 'details' | 'comments' | 'attachments'): void {
    this.activeTab = tab;
  }
  
  getStatusDisplay(status: string): string {
    switch (status) {
      case 'inProgress': return 'In Progress';
      case 'todo': return 'To Do';
      case 'completed': return 'Completed';
      default: return status;
    }
  }
  
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'inProgress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-stone-100 text-stone-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  formatDateTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMilliseconds = now.getTime() - new Date(date).getTime();
    
    // Convert milliseconds to minutes, hours, days
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      // For older dates, show the actual date
      return new Date(date).toLocaleDateString();
    }
  }
}