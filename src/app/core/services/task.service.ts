import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';
import { of, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasks: Task[] = [];

  constructor() { }

  createTask(task: Omit<Task, 'id'>): Task {
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 15),
      ...task
    };
    this.tasks.push(newTask);
    return newTask;
  }

  getTasks(): Observable<Task[]> {
    return of(this.tasks);
  }

  getTask(id: string): Task | undefined {
    return this.tasks.find(task => task.id === id);
  }

  updateTask(task: Task): void {
    const index = this.tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
      this.tasks[index] = task;
    }
  }

  deleteTask(id: string): Observable<void> {
    this.tasks = this.tasks.filter(task => task.id !== id);
    return of(undefined);
  }
}
