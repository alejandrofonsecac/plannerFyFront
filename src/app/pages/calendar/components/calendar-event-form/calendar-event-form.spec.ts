import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CalendarEventForm } from './calendar-event-form';

describe('calendar occurrence form', () => {
  it('creates a point event and permits clearing the schedule', () => {
    const fixture = TestBed.createComponent(CalendarEventForm);
    fixture.componentRef.setInput('initialDate', '2030-01-01'); fixture.detectChanges();
    const form = fixture.componentInstance; const submitted = vi.fn(); form.formSubmitted.subscribe(submitted);
    form.draft.title = 'Ler'; form.draft.endTime = ''; form.draft.priority = 'Média'; form.draft.completed = true;
    form.submit(); expect(submitted.mock.calls[0][0]).toMatchObject({ endTime: null, priority: 'Média', completed: true });
    form.draft.date = ''; form.draft.startTime = ''; form.submit();
    expect(submitted.mock.calls[1][0]).toMatchObject({ date: null, startTime: null, endTime: null });
  });

  it('emits the chosen recurrence on creation and preserves the server rule when editing', () => {
    const fixture = TestBed.createComponent(CalendarEventForm);
    fixture.componentRef.setInput('initialDate', '2030-01-01');
    fixture.detectChanges();
    const form = fixture.componentInstance;
    const submitted = vi.fn();
    form.formSubmitted.subscribe(submitted);
    form.draft.title = 'Revisão';
    form.recurrence.set({ frequency: 'MONTHLY', until: '2030-12-31' });
    form.submit();
    expect(submitted.mock.calls[0][0]).toMatchObject({
      isRecurring: true,
      recurrenceRule: 'FREQ=MONTHLY;UNTIL=20301231',
    });
    fixture.componentRef.setInput('event', { ...submitted.mock.calls[0][0], id: 2 });
    fixture.detectChanges();
    form.draft.completed = true;
    form.submit();
    expect(submitted.mock.calls[1][0].completed).toBe(true);
    expect(submitted.mock.calls[1][0].recurrenceRule).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'apenas para esta ocorrência',
    );
  });
});
