import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlannerTaskTray } from './planner-task-tray';
import { getPlannerDayAvailability } from '@pages/schedule/utils';

describe('PlannerTaskTray', () => {
  it('offers available hours, emits scheduling intent and blocks repeat submission while saving', () => {
    const fixture = TestBed.createComponent(PlannerTaskTray);
    const task = { id: 1, title: 'Ler', category: 'personal' as const };
    fixture.componentRef.setInput('availability', getPlannerDayAvailability('2026-09-10', []));
    fixture.componentRef.setInput('selectedTask', task);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('option').length).toBe(24);
    const requested = vi.fn();
    fixture.componentInstance.scheduleRequested.subscribe(requested);
    fixture.componentInstance.selectedTime.set('23:00');
    fixture.componentInstance.schedule();
    expect(requested).toHaveBeenCalledWith({ task, time: '23:00' });
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.schedule();
    expect(requested).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });
});
