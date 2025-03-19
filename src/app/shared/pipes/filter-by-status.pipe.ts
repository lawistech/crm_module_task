// src/app/shared/pipes/filter-by-status.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Task } from '../../core/models/task.model';

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(tasks: Task[], status: string): Task[] {
    if (!tasks || !status) {
      return tasks;
    }
    return tasks.filter(task => task.status === status);
  }
}