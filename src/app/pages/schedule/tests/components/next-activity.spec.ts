import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { LocalClockService } from '@app/shared/local-clock.service';
import { PlannerNextActivityCard } from '@pages/schedule/components/planner/sidebar/planner-next-activity-card/planner-next-activity-card';

describe('next activity clock', () => {
  it('updates as time passes and includes midnight on future dates', () => {
    const now = signal(new Date(2026, 8, 12, 8));
    TestBed.configureTestingModule({
      providers: [{ provide: LocalClockService, useValue: { now } }],
    });
    const fixture = TestBed.createComponent(PlannerNextActivityCard);
    fixture.componentRef.setInput('date', new Date(2026, 8, 12));
    fixture.componentRef.setInput('events', [
      {
        id: 1,
        title: 'Primeiro',
        date: '2026-09-12',
        startTime: '09:00',
        endTime: '10:00',
        category: 'work',
        kind: 'event',
      },
      {
        id: 2,
        title: 'Segundo',
        date: '2026-09-12',
        startTime: '11:00',
        endTime: '12:00',
        category: 'work',
        kind: 'event',
      },
      {
        id: 3,
        title: 'Meia-noite',
        date: '2026-09-13',
        startTime: '00:00',
        endTime: '01:00',
        category: 'work',
        kind: 'event',
      },
    ]);
    expect(fixture.componentInstance.nextActivity()?.id).toBe(1);
    now.set(new Date(2026, 8, 12, 10));
    expect(fixture.componentInstance.nextActivity()?.id).toBe(2);
    expect(fixture.componentInstance.startsInLabel()).toBe('Começa em 1h');
    fixture.componentRef.setInput('date', new Date(2026, 8, 13));
    expect(fixture.componentInstance.nextActivity()?.id).toBe(3);
  });
});
