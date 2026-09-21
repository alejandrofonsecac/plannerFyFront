import { Component, inject, output } from '@angular/core';
import { type AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TaskPriority, type Task } from '@pages/schedule/models';
import { parseLocalDate } from '@pages/schedule/utils';

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
      dueDate: value.dueDate || null,
      dueTime: value.dueTime || null,
      notes: value.notes || undefined,
      completed: value.completed,
    });
    this.onClose();
  }

  onClose(): void {
    this.closeForm.emit();
  }
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.onClose();
  }
}
