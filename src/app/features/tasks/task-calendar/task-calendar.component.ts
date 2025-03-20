// src/app/features/tasks/task-calendar/task-calendar.component.ts
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Task } from "../../../core/models/task.model";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

interface CalendarWeek {
  days: CalendarDay[];
}

@Component({
  selector: "app-task-calendar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./task-calendar.component.html",
  styleUrls: ["./task-calendar.component.scss"],
})
export class TaskCalendarComponent implements OnInit, OnChanges {
  @Input() tasks: Task[] = [];
  @Output() viewTask = new EventEmitter<Task>();

  currentDate = new Date();
  currentMonth: number;
  currentYear: number;
  calendar: CalendarWeek[] = [];

  weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  constructor() {
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.generateCalendar();
  }

  ngOnChanges(): void {
    this.generateCalendar();
  }

  generateCalendar(): void {
    this.calendar = [];

    // Get the first day of the month
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    // Get the last day of the month
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();

    // Calculate days from previous month to include
    const prevMonthDays = firstDayOfWeek;

    // Get the last day of the previous month
    const prevMonthLastDay = new Date(
      this.currentYear,
      this.currentMonth,
      0
    ).getDate();

    // Generate the calendar weeks
    let currentWeek: CalendarDay[] = [];

    // Add days from previous month
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(
        this.currentYear,
        this.currentMonth - 1,
        prevMonthLastDay - i
      );
      currentWeek.push({
        date,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        tasks: this.getTasksForDate(date),
      });
    }

    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      currentWeek.push({
        date,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        tasks: this.getTasksForDate(date),
      });

      // If we've reached the end of a week, start a new one
      if (currentWeek.length === 7) {
        this.calendar.push({ days: currentWeek });
        currentWeek = [];
      }
    }

    // Add days from next month to complete the last week if needed
    if (currentWeek.length > 0) {
      const daysToAdd = 7 - currentWeek.length;
      for (let day = 1; day <= daysToAdd; day++) {
        const date = new Date(this.currentYear, this.currentMonth + 1, day);
        currentWeek.push({
          date,
          isCurrentMonth: false,
          isToday: this.isToday(date),
          tasks: this.getTasksForDate(date),
        });
      }
      this.calendar.push({ days: currentWeek });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  getTasksForDate(date: Date): Task[] {
    return this.tasks.filter((task) => {
      if (!task.dueDate) return false;

      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  // Jump to current month
  goToToday(): void {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.generateCalendar();
  }

  // Handle task click
  onTaskClick(task: Task): void {
    this.viewTask.emit(task);
  }

  // Get priority class for task
  getPriorityClass(priority: string): string {
    switch (priority) {
      case "high":
        return "bg-rose-200 border-rose-400";
      case "medium":
        return "bg-amber-200 border-amber-400";
      case "low":
        return "bg-emerald-200 border-emerald-400";
      default:
        return "bg-stone-200 border-stone-400";
    }
  }

  // Get status class for task dot
  getStatusClass(status: string): string {
    switch (status) {
      case "completed":
        return "bg-emerald-500";
      case "inProgress":
        return "bg-blue-500";
      case "todo":
        return "bg-amber-500";
      default:
        return "bg-stone-500";
    }
  }
}
