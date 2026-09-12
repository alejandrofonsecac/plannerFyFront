import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerSchedulingService } from './planner-scheduling.service';
import { PlannerService } from './planner.service';
import type { PlannerEvent } from '@pages/schedule/models';

describe('PlannerSchedulingService', () => {
  const task = { id: 1, title: 'Ler', category: 'personal' as const };
  const event: PlannerEvent = {
    ...task,
    id: 20,
    date: '2026-09-10',
    startTime: '23:00',
    endTime: '24:00',
    kind: 'task',
  };
  let repository: {
    events: ReturnType<typeof signal<PlannerEvent[]>>;
    unscheduledTasks: ReturnType<typeof signal<(typeof task)[]>>;
    createEvent: ReturnType<typeof vi.fn>;
    removeUnscheduledTask: ReturnType<typeof vi.fn>;
    updateEvent: ReturnType<typeof vi.fn>;
    removeEvent: ReturnType<typeof vi.fn>;
  };
  let service: PlannerSchedulingService;
  beforeEach(() => {
    repository = {
      events: signal([]),
      unscheduledTasks: signal([task]),
      createEvent: vi.fn().mockResolvedValue(event),
      removeUnscheduledTask: vi.fn().mockResolvedValue(undefined),
      updateEvent: vi.fn().mockResolvedValue(event),
      removeEvent: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PlannerService, useValue: repository }],
    });
    service = TestBed.inject(PlannerSchedulingService);
  });

  it('waits for confirmed creation before removing a task and prevents concurrent requests', async () => {
    let confirm!: (event: PlannerEvent) => void;
    repository.createEvent.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      }),
    );
    const pending = service.scheduleTask(1, event.date, '23:00');
    expect(service.busy()).toBe(true);
    expect(repository.removeUnscheduledTask).not.toHaveBeenCalled();
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'busy' });
    confirm(event);
    expect(await pending).toEqual({ status: 'saved', event });
    expect(repository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '23:00', endTime: '24:00' }),
      'task',
    );
    expect(repository.removeUnscheduledTask).toHaveBeenCalledWith(1);
    expect(service.busy()).toBe(false);
  });

  it('does not remove the task or report success when POST fails', async () => {
    repository.createEvent.mockRejectedValue(new Error('offline'));
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'failed' });
    expect(repository.removeUnscheduledTask).not.toHaveBeenCalled();
    expect(service.busy()).toBe(false);
  });

  it('retries only the failed cleanup after a confirmed creation', async () => {
    repository.removeUnscheduledTask.mockRejectedValueOnce(new Error('offline'));
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({
      status: 'cleanup-pending',
      event,
    });
    repository.events.set([event]);
    expect(await service.scheduleTask(1, event.date, '')).toEqual({ status: 'saved', event });
    expect(repository.createEvent).toHaveBeenCalledTimes(1);
    expect(repository.removeUnscheduledTask).toHaveBeenCalledTimes(2);
  });

  it('rejects occupied/invalid slots and missing tasks without writes', async () => {
    repository.events.set([{ ...event, startTime: '23:15', endTime: '23:30' }]);
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'occupied' });
    expect(await service.scheduleTask(1, event.date, '24:00')).toEqual({ status: 'invalid' });
    expect(await service.scheduleTask(99, event.date, '12:00')).toEqual({ status: 'missing-task' });
    expect(repository.createEvent).not.toHaveBeenCalled();
  });

  it('ignores the edited event itself but still checks conflicts with other events', async () => {
    repository.events.set([event]);
    expect((await service.updateEvent({ ...event, title: 'Novo título' })).status).toBe('saved');
    repository.events.set([event, { ...event, id: 21 }]);
    expect((await service.updateEvent(event)).status).toBe('occupied');
    expect(repository.updateEvent).toHaveBeenCalledTimes(1);
  });
});
