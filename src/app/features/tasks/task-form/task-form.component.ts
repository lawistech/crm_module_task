// src/app/features/tasks/task-form/task-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';

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
  
  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
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
      dueDate: [''],
      tags: ['']
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
      tags: this.task.tags ? this.task.tags.join(', ') : ''
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
      tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : []
    };
    
    if (this.task) {
      // Update existing task
      const updatedTask = { ...this.task, ...taskData };
      this.taskService.updateTask(updatedTask).subscribe({
        next: (result) => {
          this.taskSaved.emit(result);
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error updating task:', error);
          this.isSubmitting = false;
        }
      });
    } else {
      // Create new task
      this.taskService.createTask(taskData).subscribe({
        next: (result) => {
          this.taskSaved.emit(result);
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error creating task:', error);
          this.isSubmitting = false;
        }
      });
    }
  }
  
  cancel(): void {
    this.closeForm.emit();
  }
  
  // Convenience getter for form controls
  get f() { return this.taskForm.controls; }
}