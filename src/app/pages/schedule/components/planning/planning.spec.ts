import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannerDaySummary, PlannerEvent } from '@pages/schedule/models';
import { HabitExecutionService } from '@pages/schedule/services/habit-execution.service';
import { PlannerSchedulingService } from '@pages/schedule/services/planner-scheduling.service';
import { PlannerService } from '@pages/schedule/services/planner.service';
import { Planning } from './planning';

describe('undated event scheduling across planner displays', () => {
  const undated: PlannerEvent = {
    id: 1,
    title: 'Ler',
    category: 'personal',
    date: null,
    startTime: null,
    endTime: null,
    kind: 'event',
  };
  const summary: PlannerDaySummary = {
    date: '2026-09-10',
    events: [],
    availability: {
      date: '2026-09-10',
      totalBlocks: 24,
      occupiedBlocks: 0,
      availableBlocks: 24,
      availableHours: 24,
      slots: [],
    },
    undatedCount: 1,
    eventCount: 0,
    plannedMinutes: 0,
    freeMinutes: 1440,
    freeTimePercentage: 100,
    nextActivity: null,
  };
  const planner = {
    events: signal<PlannerEvent[]>([]),
    undatedEvents: signal([undated]),
    summary: signal(summary),
    loadSummary: vi.fn(),
    error: signal(null),
  };
  const scheduling = {
    busy: signal(false),
    scheduleUndatedEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    scheduling.scheduleUndatedEvent.mockResolvedValue({
      status: 'saved',
      event: { ...undated, date: '2026-09-10', startTime: '23:00', endTime: '24:00' },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PlannerService, useValue: planner },
        { provide: PlannerSchedulingService, useValue: scheduling },
      ],
    });
    TestBed.overrideComponent(Planning, {
      set: {
        providers: [
          {
            provide: HabitExecutionService,
            useValue: { error: signal(null), habits: signal([]), load: vi.fn() },
          },
        ],
      },
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(Planning);
    fixture.componentRef.setInput('selectedDate', new Date(2026, 8, 10));
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('schedules the selected event on the selected day and clears the selection', async () => {
    const component = setup();
    component.selectedUndatedEvent.set(undated);
    await component.scheduleUndatedEvent(undated, '23:00');
    expect(scheduling.scheduleUndatedEvent).toHaveBeenCalledWith(undated, '2026-09-10', '23:00');
    expect(component.selectedUndatedEvent()).toBeNull();
    expect(component.scheduleMessage()).toBe('Ler agendado para 23:00.');
  });

  it('keeps the event undated when the destination is occupied or the drop was cancelled', async () => {
    const component = setup();
    scheduling.scheduleUndatedEvent.mockResolvedValueOnce({ status: 'occupied' });
    component.selectedUndatedEvent.set(undated);
    await component.scheduleUndatedEvent(undated, '23:00');
    expect(component.operationError()).toContain('ocupado');
    expect(component.selectedUndatedEvent()).toEqual(undated);
    component.onUndatedEventDropped(
      {
        previousContainer: { id: 'undated-events' },
        isPointerOverContainer: false,
        item: { data: undated },
      } as CdkDragDrop<unknown, PlannerEvent[], PlannerEvent>,
      '08:00',
    );
    expect(scheduling.scheduleUndatedEvent).toHaveBeenCalledTimes(1);
  });
});
