import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlannerEvent } from '@pages/schedule/models';
import { PlannerSchedulingService } from './planner-scheduling.service';
import { PlannerService } from './planner.service';

describe('PlannerSchedulingService', () => {
  const undated: PlannerEvent = {
    id: 1,
    title: 'Ler',
    category: 'personal',
    date: null,
    startTime: null,
    endTime: null,
    kind: 'event',
  };
  const scheduled: PlannerEvent = {
    ...undated,
    date: '2026-09-10',
    startTime: '23:00',
    endTime: '24:00',
  };
  let repository: {
    createEvent: ReturnType<typeof vi.fn>;
    updateEvent: ReturnType<typeof vi.fn>;
    removeEvent: ReturnType<typeof vi.fn>;
  };
  let service: PlannerSchedulingService;

  beforeEach(() => {
    repository = {
      createEvent: vi.fn().mockResolvedValue(scheduled),
      updateEvent: vi.fn().mockResolvedValue(scheduled),
      removeEvent: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: PlannerService, useValue: repository }],
    });
    service = TestBed.inject(PlannerSchedulingService);
  });

  it('schedules an undated event as a one-hour block so the API can check conflicts', async () => {
    expect(await service.scheduleUndatedEvent(undated, '2026-09-10', '23:00')).toEqual({
      status: 'saved',
      event: scheduled,
    });
    expect(repository.updateEvent).toHaveBeenCalledWith(scheduled);
  });

  it('prevents concurrent requests while a write is pending', async () => {
    let confirm!: (event: PlannerEvent) => void;
    repository.updateEvent.mockReturnValue(new Promise((resolve) => (confirm = resolve)));
    const pending = service.scheduleUndatedEvent(undated, '2026-09-10', '23:00');
    expect(service.busy()).toBe(true);
    expect(await service.scheduleUndatedEvent(undated, '2026-09-10', '23:00')).toEqual({
      status: 'busy',
    });
    confirm(scheduled);
    expect(await pending).toEqual({ status: 'saved', event: scheduled });
    expect(repository.updateEvent).toHaveBeenCalledTimes(1);
    expect(service.busy()).toBe(false);
  });

  it('maps API conflicts and permission errors to explicit results', async () => {
    for (const [status, result] of [
      [409, 'occupied'],
      [404, 'missing-event'],
      [403, 'forbidden'],
      [401, 'unauthorized'],
      [422, 'invalid'],
    ] as const) {
      repository.updateEvent.mockRejectedValueOnce(new HttpErrorResponse({ status }));
      expect(await service.updateEvent(scheduled)).toEqual({ status: result });
    }
  });

  it('does not report success when a write fails for an unknown reason', async () => {
    repository.updateEvent.mockRejectedValueOnce(new Error('offline'));
    expect(await service.updateEvent(scheduled)).toEqual({ status: 'failed' });
    repository.updateEvent.mockRejectedValueOnce({ status: 409 });
    expect(await service.updateEvent(scheduled)).toEqual({ status: 'failed' });
    expect(service.busy()).toBe(false);
  });
});
