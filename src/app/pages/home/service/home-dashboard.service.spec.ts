import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PlannerViewService } from '@app/shared/planner-view.service';
import { ApiClient } from '../../../core/data-access/api-client.service';
import { WeatherResponse } from '../models/weather';
import { HomeDashboardService } from './home-dashboard.service';
import { WeatherService } from './weather/weatherService.service';

describe('HomeDashboardService weather', () => {
  it('shows weather while other requests are pending and preserves it when they finish', () => {
    const pendingAvailability = new Subject();
    const weather = signal<WeatherResponse | null>(null);
    const load = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiClient, useValue: { getAll: () => of([]), get: () => pendingAvailability } },
        {
          provide: WeatherService,
          useValue: { weather, loading: signal(false), error: signal(null), load },
        },
      ],
    });
    const dashboardService = TestBed.inject(HomeDashboardService);
    dashboardService.load();
    weather.set({ temperature: 0, city: 'São Paulo', condition: 'Céu limpo' });

    expect(load).toHaveBeenCalledOnce();
    expect(dashboardService.dashboard().day.temperature).toBe('0 °C');
    expect(dashboardService.dashboard().day.city).toBe('São Paulo');
    expect(dashboardService.dashboard().day.weatherIcon).toBe('wb_sunny');

    pendingAvailability.error(new Error('Planner unavailable'));
    expect(dashboardService.dashboard().day.temperature).toBe('0 °C');
    expect(dashboardService.dashboard().day.weatherCondition).toBe('Céu limpo');
  });
});

describe('HomeDashboardService sleep schedule', () => {
  it('hides free sleep hours from the available time and keeps busy ones', () => {
    // Hour 6 is busy; every other hour is free.
    const slots = Array.from({ length: 24 }, (_, hour) => ({
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(hour + 1).padStart(2, '0')}:00`,
      available: hour !== 6,
    }));
    const response = {
      date: '2026-10-08',
      planner: {
        availability: {
          date: '2026-10-08',
          totalBlocks: 24,
          occupiedBlocks: 1,
          availableBlocks: 23,
          availableHours: 23,
          slots,
        },
        events: [],
      },
      focus: null,
      habits: [],
      summary: { completedEvents: 0, totalEvents: 0, highestCurrentStreak: 0 },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiClient, useValue: { get: () => of(response) } },
        {
          provide: WeatherService,
          useValue: { weather: signal(null), loading: signal(false), error: signal(null), load: vi.fn() },
        },
      ],
    });
    const dashboardService = TestBed.inject(HomeDashboardService);
    dashboardService.load();
    expect(dashboardService.dashboard().availableTime.segments).toHaveLength(24);

    TestBed.inject(PlannerViewService).updateSleep({ enabled: true, start: 23, end: 7 });
    const available = dashboardService.dashboard().availableTime;
    expect(available.segments.map((segment) => segment.label)).toContain('06:00 a 07:00');
    expect(available.segments).toHaveLength(17);
    expect(available.value).toBe('16h');
    expect(available.description).toBe('16 de 17 blocos livres, sem o horário de sono');
  });
});
