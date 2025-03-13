// src/app/features/tasks/task-form/task-form.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';
import { Contact } from '../../../core/models/contact.model';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService } from '../../../core/services/task.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html'
})
export class TaskFormComponent implements OnInit {
  @Input() isOpen = false;
  @Input() task: Task | null = null;
  @Input() isEditing = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Task>();

  taskForm!: FormGroup;
  isLoading = false;
  contacts: Contact[] = [];
  
  // For template access
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private taskService: TaskService,
    private supabaseService: SupabaseService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadContacts();
  }

  async loadContacts(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.getContacts();
      
      if (error) {
        throw error;
      }
      
      this.contacts = data || [];
    } catch (error: any) {
      this.notificationService.error('Failed to load contacts: ' + error.message);
    }
  }

  initForm(): void {
    this.taskForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      status: [TaskStatus.TODO, Validators.required],
      priority: [TaskPriority.MEDIUM, Validators.required],
      due_date: [''],
      related_to_contact: ['']
    });

    if (this.isEditing && this.task) {
      // Format due date for datetime-local input
      const dueDateFormatted = this.task.due_date ? this.formatDateForInput(this.task.due_date) : '';
      
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description || '',
        status: this.task.status,
        priority: this.task.priority,
        due_date: dueDateFormatted,
        related_to_contact: this.task.related_to_contact || ''
      });
    }
  }

  formatDateForInput(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().substring(0, 16); // Format for datetime-local input: YYYY-MM-DDThh:mm
  }

  close(): void {
    this.closed.emit();
  }

  async saveTask(): Promise<void> {
    if (this.taskForm.invalid) {
      return;
    }

    this.isLoading = true;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const formValues = { ...this.taskForm.value };
      
      // Format date if provided
      if (formValues.due_date) {
        formValues.due_date = new Date(formValues.due_date).toISOString();
      }

      if (!this.isEditing) {
        // Add required fields for new task
        formValues.created_by = currentUser.id;
        formValues.assigned_to = currentUser.id; // Default to current user
      }

      let result;
      if (this.isEditing && this.task) {
        result = await this.taskService.updateTask(this.task.id, formValues);
      } else {
        result = await this.taskService.createTask(formValues);
      }

      if (result.error) {
        throw result.error;
      }

      this.notificationService.success(
        this.isEditing ? 'Task updated successfully' : 'Task created successfully'
      );

      if (result.data && result.data.length > 0) {
        this.saved.emit(result.data[0]);
      }

      this.close();
    } catch (error: any) {
      this.notificationService.error('Failed to save task: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }
}