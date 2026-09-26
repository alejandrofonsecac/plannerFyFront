import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Planning } from './planning';
import { PlannerService } from '@pages/schedule/services/planner-services/planner.service';
import { HabitExecutionService } from '@pages/schedule/services/habit-execution.service';
import type { PlannerEvent, PlannerTask } from '@pages/schedule/models';

describe('task scheduling across planner displays', () => {
  const task: PlannerTask = { id: 1, title: 'Ler', category: 'personal' };
  const service = {
    events: signal<PlannerEvent[]>([]),
    unscheduledTasks: signal([task]),
    summary: signal({ date: '2026-09-10', events: [], availability: { date: '2026-09-10', totalBlocks: 24, occupiedBlocks: 0, availableBlocks: 24, availableHours: 24, slots: [] }, taskCount: 1, eventCount: 0, plannedMinutes: 0, freeMinutes: 1440, freeTimePercentage: 100, nextActivity: null }),
    loadSummary: vi.fn(),
    scheduleTask: vi.fn().mockResolvedValue({ id: 10, startTime: '23:00', kind: 'task' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    service.events.set([]);
    service.unscheduledTasks.set([task]);
    TestBed.configureTestingModule({ providers: [{ provide: PlannerService, useValue: service }] });
    TestBed.overrideComponent(Planning, {
      set: {
        providers: [
          {
            provide: HabitExecutionService,
            useValue: {
              error: signal(null),
              habits: signal([]),
              load: vi.fn(),
            },
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

  it('schedules the last hour using the selected day and a midnight end', async () => {
    const component = setup();
    component.selectedTask.set(task);
    await component.scheduleTask(task, '23:00');
    expect(service.scheduleTask).toHaveBeenCalledWith(task.id, '2026-09-10', '23:00');
    expect(component.selectedTask()).toBeNull();
  });

  it('keeps the task unscheduled when the destination is occupied or the drop was cancelled', async () => {
    const component = setup();
    service.scheduleTask.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    component.selectedTask.set(task);
    await component.scheduleTask(task, '23:00');
    expect(component.operationError()).toContain('ocupado');
    component.onTaskDropped(
      {
        previousContainer: { id: 'unplanned-tasks' },
        isPointerOverContainer: false,
        item: { data: task },
      } as CdkDragDrop<unknown, PlannerTask[], PlannerTask>,
      '08:00',
    );
    expect(service.scheduleTask).toHaveBeenCalledTimes(1);
  });
});
