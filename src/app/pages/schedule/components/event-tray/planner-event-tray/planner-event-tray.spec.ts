import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PLANNER_DAY_SLOTS } from '@pages/schedule/constants';
import type { PlannerDayAvailability, PlannerEvent } from '@pages/schedule/models';
import { PlannerEventTray } from './planner-event-tray';

const busyHours = new Set(['00:00', '09:00']);
const availability: PlannerDayAvailability = {
  date: '2026-09-10',
  totalBlocks: 24,
  occupiedBlocks: busyHours.size,
  availableBlocks: 24 - busyHours.size,
  availableHours: 24 - busyHours.size,
  slots: PLANNER_DAY_SLOTS.map((slot) => ({ ...slot, available: !busyHours.has(slot.startTime) })),
};
const event: PlannerEvent = {
  id: 1,
  title: 'Ler',
  category: 'personal',
  date: null,
  startTime: null,
  endTime: null,
  kind: 'event',
};

function createTray() {
  const fixture = TestBed.createComponent(PlannerEventTray);
  fixture.componentRef.setInput('availability', availability);
  fixture.componentRef.setInput('selectedEvent', event);
  fixture.detectChanges();
  const requested = vi.fn();
  fixture.componentInstance.scheduleRequested.subscribe(requested);
  return { fixture, requested };
}

describe('PlannerEventTray', () => {
  it('emits scheduling intent and blocks repeat submission while saving', () => {
    const { fixture, requested } = createTray();
    expect(fixture.nativeElement.querySelectorAll('option').length).toBe(24);
    fixture.componentInstance.selectedTime.set('23:00');
    fixture.componentInstance.schedule();
    expect(requested).toHaveBeenCalledWith({ event, time: '23:00' });
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.schedule();
    expect(requested).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('suggests the first free hour and refuses occupied hours', () => {
    const { fixture, requested } = createTray();
    expect(fixture.componentInstance.selectedTime()).toBe('01:00');
    const options = [...fixture.nativeElement.querySelectorAll('option')] as HTMLOptionElement[];
    expect(options.filter((option) => option.disabled).map((option) => option.value)).toEqual([
      '00:00',
      '09:00',
    ]);
    fixture.componentInstance.selectedTime.set('09:00');
    fixture.componentInstance.schedule();
    expect(requested).not.toHaveBeenCalled();
  });
});
