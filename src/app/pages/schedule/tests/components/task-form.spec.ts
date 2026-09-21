import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { TaskForm } from '@pages/schedule/components/tasks/task-form/task-form';
import { dateKey } from '@pages/schedule/utils';

describe('task form dates', () => {
  it('uses the form values without duplicate change handlers or a UTC conversion', () => {
    const fixture = TestBed.createComponent(TaskForm);
    const form = fixture.componentInstance;
    const saved = vi.fn();
    form.saveForm.subscribe(saved);
    form.taskForm.patchValue({ title: 'Ler', dueDate: dateKey(new Date()), dueTime: '23:00' });
    form.onSubmit();
    expect(saved.mock.calls[0][0]).toMatchObject({ dueDate: dateKey(new Date()), dueTime: '23:00' });
    form.taskForm.patchValue({ dueDate: '', dueTime: '' });
    form.onSubmit();
    expect(saved.mock.calls[1][0]).toMatchObject({ dueDate: null, dueTime: null });
  });
  it('does not submit an impossible calendar date', () => {
    const form = TestBed.createComponent(TaskForm).componentInstance;
    const saved = vi.fn();
    form.saveForm.subscribe(saved);
    form.taskForm.patchValue({ title: 'Ler', dueDate: '2026-02-30' });
    form.onSubmit();
    expect(saved).not.toHaveBeenCalled();
  });
});
