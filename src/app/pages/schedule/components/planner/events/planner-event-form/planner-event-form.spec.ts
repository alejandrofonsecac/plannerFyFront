import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlannerEventForm } from './planner-event-form';

describe('event form submission', () => {
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
