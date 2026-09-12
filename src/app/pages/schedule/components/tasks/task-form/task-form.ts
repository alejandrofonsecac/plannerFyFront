import { Component, inject, output } from '@angular/core';
import { type AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TaskPriority, type Task } from '@pages/schedule/models';
import { dateKey, parseLocalDate } from '@pages/schedule/utils';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm {
  readonly closeForm = output<void>();
  readonly saveForm = output<Omit<Task, 'id'>>();
  readonly priorities = Object.values(TaskPriority);
  private readonly fb = inject(FormBuilder);
  readonly taskForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    priority: [TaskPriority.NORMAL],
    dueDate: [
      '',
      (control: AbstractControl<string>) =>
        !control.value || parseLocalDate(control.value) ? null : { date: true },
    ],
    dueTime: [''],
    notes: [''],
    completed: [false],
  });

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const value = this.taskForm.getRawValue();
    this.saveForm.emit({
      title: value.title,
      priority: value.priority,
      dueLabel: this.getDueLabel(value.dueDate, value.dueTime),
      notes: value.notes || undefined,
      completed: value.completed,
    });
    this.onClose();
  }

  private getDueLabel(date: string, time: string): string {
    const parsed = parseLocalDate(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateLabel = !parsed
      ? ''
      : date === dateKey(today)
        ? 'Hoje'
        : date === dateKey(tomorrow)
          ? 'Amanhã'
          : parsed.toLocaleDateString('pt-BR');
    return [dateLabel, time].filter(Boolean).join(', ') || 'Sem data';
  }

  onClose(): void {
    this.closeForm.emit();
  }
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.onClose();
  }
}
