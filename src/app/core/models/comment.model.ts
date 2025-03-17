export interface Comment {
    id: string;
    taskId: string;
    userId: string;
    text: string;
    createdAt: Date;
    user?: string;
  }