// src/app/features/tasks/task-board/task-board.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';
import { TaskFormComponent } from '../task-form/task-form.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFormComponent],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  showTaskForm: boolean = false;
  currentTask: Task | null = null;
  isLoading: boolean = true;
  
  // Filters
  statusFilter: string = 'all';
  priorityFilter: string = 'all';
  searchTerm: string = '';

  constructor(
    private taskService: TaskService, 
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.error('Failed to load tasks');
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredTasks = this.tasks.filter(task => {
      // Status filter
      if (this.statusFilter !== 'all' && task.status !== this.statusFilter) {
        return false;
      }
      
      // Priority filter
      if (this.priorityFilter !== 'all' && task.priority !== this.priorityFilter) {
        return false;
      }
      
      // Search filter (search in title and description)
      if (this.searchTerm && !this.matchesSearch(task)) {
        return false;
      }
      
      return true;
    });
  }
  
  matchesSearch(task: Task): boolean {
    const term = this.searchTerm.toLowerCase();
    return task.title.toLowerCase().includes(term) || 
           (task.description ? task.description.toLowerCase().includes(term) : false);
  }

  deleteTask(id: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(task => task.id !== id);
          this.applyFilters();
          this.notificationService.success('Task deleted successfully');
        },
        error: (error) => {
          console.error(error);
        }
      });
    }
  }

  createTask(): void {
    this.currentTask = null;
    this.showTaskForm = true;
  }
  
  editTask(task: Task): void {
    this.currentTask = {...task};
    this.showTaskForm = true;
  }

  closeTaskForm(): void {
    this.showTaskForm = false;
    this.currentTask = null;
  }

  onTaskSaved(task: Task): void {
    if (this.tasks.find(t => t.id === task.id)) {
      // Update existing task in the list
      this.tasks = this.tasks.map(t => t.id === task.id ? task : t);
    } else {
      // Add new task to the list
      this.tasks.unshift(task);
    }
    
    this.applyFilters();
    this.closeTaskForm();
    this.notificationService.success('Task saved successfully');
  }
  
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'inProgress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  getStatusDisplay(status: string): string {
    switch (status) {
      case 'inProgress': return 'In Progress';
      case 'todo': return 'To Do';
      case 'completed': return 'Completed';
      default: return status;
    }
  }
}