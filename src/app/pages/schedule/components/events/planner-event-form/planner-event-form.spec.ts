import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlannerEventForm } from './planner-event-form';

describe('event form submission', () => {
  it('creates an undated completed event with priority and preserves nulls on edit', () => {
    const fixture = TestBed.createComponent(PlannerEventForm);
    fixture.componentRef.setInput('date', new Date(2030, 0, 1));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    form.title.set('Ler');
    form.clearSchedule();
    form.priority.set('Alta');
    form.completed.set(true);
    const created = vi.fn();
    form.created.subscribe(created);
    form.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(created.mock.calls[0][0]).toMatchObject({
      date: null,
      startTime: null,
      endTime: null,
      priority: 'Alta',
      completed: true,
    });
    fixture.componentRef.setInput('event', { ...created.mock.calls[0][0], id: 1, kind: 'event' });
    fixture.detectChanges();
    expect(form.eventDate()).toBe('');
    expect(form.endTime()).toBe('');
    expect(form.isDirty()).toBe(false);
    form.priority.set('');
    expect(form.isDirty()).toBe(true);
  });

  it('explains which part of the schedule is missing', () => {
    const fixture = TestBed.createComponent(PlannerEventForm);
    fixture.componentRef.setInput('date', new Date(2026, 8, 10));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    const created = vi.fn();
    form.created.subscribe(created);
    form.title.set('Ler');
    form.eventDate.set('');
    form.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(form.errorMessage()).toBe('Escolha um dia para definir o horário.');
    form.clearSchedule();
    form.endTime.set('10:00');
    form.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(form.errorMessage()).toBe('Informe o início antes do término.');
    expect(created).not.toHaveBeenCalled();
  });

  it('retains the draft while awaiting confirmation and allows retry after failure', () => {
    const fixture = TestBed.createComponent(PlannerEventForm);
    fixture.componentRef.setInput('date', new Date(2026, 8, 10));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    form.title.set('Reunião');
    form.description.set('Manter meus detalhes');
    const created = vi.fn();
    form.created.subscribe(created);
    form.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    fixture.componentRef.setInput('saving', true);
    form.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(created).toHaveBeenCalledTimes(1);
    expect(form.title()).toBe('Reunião');
    fixture.componentRef.setInput('saving', false);
    form.submit({ preventDefault: vi.fn() } as unknown as SubmitEvent);
    expect(created).toHaveBeenCalledTimes(2);
    expect(created.mock.calls[1][0].description).toBe('Manter meus detalhes');
  });
});
