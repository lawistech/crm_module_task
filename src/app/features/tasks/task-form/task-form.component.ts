// src/app/features/tasks/task-form/task-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  
  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.initForm();
    
    if (this.task) {
      this.patchFormWithTaskData();
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
    
    taskOperation.subscribe({
      next: (result) => {
        this.taskSaved.emit(result);
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error saving task:', error);
        this.notificationService.error('Failed to save task: ' + error.message);
        this.isSubmitting = false;
      }
    });
  }
  
  cancel(): void {
    this.closeForm.emit();
  }
  
  // Convenience getter for form controls
  get f() { return this.taskForm.controls; }
}