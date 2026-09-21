export enum TaskPriority {
  ALTA = 'Alta',
  MEDIA = 'Média',
  NORMAL = 'Normal',
}
export interface Task {
  id: number;
  title: string;
  priority: TaskPriority;
  dueLabel?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  completed: boolean;
  notes?: string;
}
