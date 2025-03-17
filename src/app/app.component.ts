// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { TaskBoardComponent } from './features/tasks/task-board/task-board.component';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, TaskBoardComponent, RouterModule]
})
export class AppComponent implements OnInit {
  showSidebar = true;

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {
    // Hide sidebar on login/register pages
    this.router.events.subscribe(() => {
      const currentRoute = this.router.url;
      this.showSidebar = !(currentRoute.includes('/login') || currentRoute.includes('/register'));
    });
  }
  
  ngOnInit(): void {
  }
  
  // Add this getter method
  get userInitial(): string {
    const user = this.authService.getCurrentUser();
    return user?.email ? user.email.charAt(0).toUpperCase() : '';
  }
}
