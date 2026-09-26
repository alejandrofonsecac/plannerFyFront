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
    scheduleTask: ReturnType<typeof vi.fn>;
    updateEvent: ReturnType<typeof vi.fn>;
    removeEvent: ReturnType<typeof vi.fn>;
  };
  let service: PlannerSchedulingService;
  beforeEach(() => {
    repository = {
      events: signal([]),
      unscheduledTasks: signal([task]),
      createEvent: vi.fn().mockResolvedValue(event),
      scheduleTask: vi.fn().mockResolvedValue(event),
      updateEvent: vi.fn().mockResolvedValue(event),
      removeEvent: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PlannerService, useValue: repository }],
    });
    service = TestBed.inject(PlannerSchedulingService);
  });

  it('uses the transactional backend operation and prevents concurrent requests', async () => {
    let confirm!: (event: PlannerEvent) => void;
    repository.scheduleTask.mockReturnValue(
      new Promise((resolve) => {
        confirm = resolve;
      }),
    );
    const pending = service.scheduleTask(1, event.date, '23:00');
    expect(service.busy()).toBe(true);
    expect(repository.scheduleTask).toHaveBeenCalledWith(1, event.date, '23:00');
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'busy' });
    confirm(event);
    expect(await pending).toEqual({ status: 'saved', event });
    expect(repository.scheduleTask).toHaveBeenCalledWith(1, event.date, '23:00');
    expect(service.busy()).toBe(false);
  });

  it('does not report success when scheduling fails', async () => {
    repository.scheduleTask.mockRejectedValue(new Error('offline'));
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'failed' });
    expect(service.busy()).toBe(false);
  });

  it('returns a confirmed server result', async () => {
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'saved', event });
    expect(repository.scheduleTask).toHaveBeenCalledWith(1, event.date, '23:00');
  });

  it('keeps an unknown scheduling failure as failed', async () => {
    repository.scheduleTask.mockRejectedValue({ status: 409 });
    expect(await service.scheduleTask(1, event.date, '23:00')).toEqual({ status: 'failed' });
  });

  it('ignores the edited event itself but still checks conflicts with other events', async () => {
    repository.events.set([event]);
    expect((await service.updateEvent({ ...event, title: 'Novo título' })).status).toBe('saved');
    expect((await service.updateEvent(event)).status).toBe('saved');
    expect(repository.updateEvent).toHaveBeenCalledTimes(2);
  });
});
