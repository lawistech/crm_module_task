import { Component, OnInit } from '@angular/core';
import { Task } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';
import { CommonModule } from '@angular/common';
import { TaskFormComponent } from '../task-form/task-form.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, TaskFormComponent],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {
  tasks: Task[] = [];
  showTaskForm: boolean = false;

  constructor(private taskService: TaskService, private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
      },
      error: (error) => {
      //  this.notificationService.showError('Failed to load tasks', error.message);
      }
    });
  }

  deleteTask(id: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(task => task.id !== id);
        //  this.notificationService.showSuccess('Task deleted successfully');
        },
        error: (error) => {
         // this.notificationService.showError('Failed to delete task', error.message);
        }
      });
    }
  }

  openTaskForm(): void {
    this.showTaskForm = true;
  }

  closeTaskForm(): void {
    this.showTaskForm = false;
  }

  onTaskCreated(newTask: Task): void {
    this.tasks.push(newTask);
    this.closeTaskForm();
  //  this.notificationService.showSuccess('Task created successfully');
  }
}
