import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GoalRequest } from '../../../../shared/goals/goal.models';
import { WeeklyGoalsCard } from './weekly-goals-card';

const WEEKLY_GOALS_URL = 'http://localhost:8080/goals/board';

const WEEKLY_GOALS: (GoalRequest & { id: number })[] = [
  {
    id: 1,
    name: 'Estudar Java',
    expectedTarget: 'Concluir cinco aulas.',
    priority: 'HIGH',
    category: 'STUDY',
  },
  {
    id: 2,
    name: 'Caminhar',
    expectedTarget: 'Caminhar três vezes.',
    priority: 'NORMAL',
    category: 'HEALTH',
  },
];

describe('WeeklyGoalsCard', () => {
  let fixture: ComponentFixture<WeeklyGoalsCard>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WeeklyGoalsCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(WeeklyGoalsCard);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads and renders every weekly goal using the backend contract', () => {
    expect(element.textContent).toContain('Carregando metas semanais...');
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true');

    const request = http.expectOne(WEEKLY_GOALS_URL);
    expect(request.request.method).toBe('GET');
    request.flush({ goals: WEEKLY_GOALS });
    fixture.detectChanges();

    expect(element.querySelectorAll('li h3')).toHaveLength(2);
    expect(element.textContent).toContain('Estudar Java');
    expect(element.textContent).toContain('Concluir cinco aulas.');
    expect(element.textContent).toContain('Prioridade: Alta');
    expect(element.textContent).toContain('Estudo');
    expect(element.textContent).toContain('Caminhar');
    expect(element.textContent).toContain('Saúde');
    expect(element.textContent).not.toContain('Null');
    expect(element.textContent).not.toContain('%');
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('false');
  });

  it('shows an empty state when no goals are registered', () => {
    http.expectOne(WEEKLY_GOALS_URL).flush({ goals: [] });
    fixture.detectChanges();

    expect(element.textContent).toContain('Nenhuma meta semanal cadastrada.');
    expect(element.querySelectorAll('li h3')).toHaveLength(0);
    expect(element.querySelector('button')).toBeNull();
  });

  it('shows an error and loads real data when the user retries', () => {
    http.expectOne(WEEKLY_GOALS_URL).flush(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
    fixture.detectChanges();

    expect(element.textContent).toContain('Não foi possível carregar as metas semanais.');
    expect(element.textContent).not.toContain('Nenhuma meta semanal cadastrada.');

    const retryButton = element.querySelector('button');
    expect(retryButton).not.toBeNull();
    retryButton?.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Carregando metas semanais...');
    http.expectOne(WEEKLY_GOALS_URL).flush({ goals: WEEKLY_GOALS });
    fixture.detectChanges();

    expect(element.textContent).toContain('Estudar Java');
    expect(element.textContent).not.toContain('Não foi possível');
  });

  it('does not duplicate a request while it is loading', () => {
    fixture.componentInstance.loadGoals();
    fixture.componentInstance.loadGoals();

    http.expectOne(WEEKLY_GOALS_URL).flush({ goals: [] });
  });

  it('cancels the pending request when the card is destroyed', () => {
    const request = http.expectOne(WEEKLY_GOALS_URL);

    fixture.destroy();

    expect(request.cancelled).toBe(true);
  });
});
