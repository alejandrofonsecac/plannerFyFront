import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { PlannerService } from './planner.service';
import type { PlannerEventDraft } from '@pages/schedule/models';

describe('confirmed planner writes', () => {
  let service: PlannerService;
  let http: HttpTestingController;
  const draft: PlannerEventDraft = {
    title: 'Ler',
    date: '2026-09-10',
    description: '',
    startTime: '23:00',
    endTime: '24:00',
    category: 'personal',
  };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlannerService);
    http = TestBed.inject(HttpTestingController);
    http.match(() => true).forEach((request) => request.flush([]));
    service.events.set([]);
  });
  afterEach(() => http.verify());

  it('loads server-generated occurrences after creating a recurring event', async () => {
    const recurring = { ...draft, isRecurring: true, recurrenceRule: 'FREQ=WEEKLY;UNTIL=20261231' };
    const pending = service.createEvent(recurring);
    http
      .expectOne('http://localhost:8080/planner/events')
      .flush({ ...recurring, id: 77, kind: 'event' });
    await pending;
    http.expectOne('http://localhost:8080/planner/events').flush([
      { ...recurring, id: 77, kind: 'event' },
      { ...recurring, id: 78, date: '2026-09-17', kind: 'event' },
    ]);
    expect(service.events().map((event) => event.id)).toEqual([77, 78]);
  });

  it('only adds an event after confirmation and sends no client-generated id', async () => {
    const pending = service.createEvent(draft);
    const request = http.expectOne('http://localhost:8080/planner/events');
    expect(request.request.body).toEqual({ ...draft, source: 'internal' });
    expect(service.events()).toEqual([]);
    request.flush({ ...draft, kind: 'event', id: 77 });
    expect((await pending).id).toBe(77);
    expect(service.events()[0].id).toBe(77);
  });

  it('propagates creation errors without adding a fake success', async () => {
    const pending = service.createEvent(draft);
    const assertion = expect(pending).rejects.toMatchObject({ status: 500 });
    http
      .expectOne('http://localhost:8080/planner/events')
      .flush({}, { status: 500, statusText: 'Error' });
    await assertion;
    expect(service.events()).toEqual([]);
  });

  it('keeps an undated event in place when the update fails', async () => {
    const undated = {
      id: 1,
      title: 'Ler',
      category: 'personal',
      kind: 'event',
      date: null,
      startTime: null,
      endTime: null,
    } as const;
    service.events.set([undated]);
    const pending = service.updateEvent({ ...undated, date: '2026-09-10', startTime: '23:00' });
    const assertion = expect(pending).rejects.toMatchObject({ status: 500 });
    http
      .expectOne('http://localhost:8080/planner/events/1')
      .flush({}, { status: 500, statusText: 'Error' });
    await assertion;
    expect(service.undatedEvents()).toEqual([undated]);
  });
});
