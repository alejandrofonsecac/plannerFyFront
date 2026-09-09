import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Goal, GoalRequest, GoalsBoard } from '../../../shared/goals/goal.models';
import { Goals } from '../goals';
import { GoalService } from './goal.service';

const URL = 'http://localhost:8080/goals';
const REQUEST: GoalRequest = {
  name: ' Estudar Java ',
  expectedTarget: 'Cinco aulas',
  priority: 'NORMAL',
  category: 'STUDY',
  weekId: '2027-W01',
};
const GOAL: Goal = {
  ...REQUEST,
  id: 42,
  name: 'Estudar Java',
  weekId: '2027-W01',
  status: 'PLANNED',
  createdAt: null,
  completedAt: null,
  deferredCount: 0,
  canComplete: true,
  canDefer: true,
};
const BOARD: GoalsBoard = {
  week: {
    id: '2027-W01',
    previousId: '2026-W53',
    nextId: '2027-W02',
    currentId: '2026-W37',
    start: '2027-01-04',
    end: '2027-01-10',
    current: false,
  },
  goals: [GOAL],
  summary: { completed: 0, total: 1, percentage: 0 },
  focus: null,
  defaults: REQUEST,
  options: {
    priorities: [{ value: 'NORMAL', label: 'Média' }],
    categories: [{ value: 'STUDY', label: 'Estudo' }],
  },
};
describe('Goals API authority', () => {
  let http: HttpTestingController;
  let service: GoalService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(GoalService);
  });
  afterEach(() => http.verify());

  it('shows the server response without inventing dates or status', () => {
    service.load();
    http.expectOne(URL + '/board').flush(BOARD);
    expect(service.board()).toEqual(BOARD);
    expect(service.board()?.goals[0].createdAt).toBeNull();
  });
  it('sends filters to the server and cancels outdated reads', () => {
    service.load();
    const outdated = http.expectOne(URL + '/board');
    service.load({ weekId: '2027-W01', category: 'STUDY', status: 'COMPLETED' });
    expect(outdated.cancelled).toBe(true);
    http
      .expectOne(URL + '/board?weekId=2027-W01&category=STUDY&status=COMPLETED')
      .flush({ ...BOARD, goals: [] });
    expect(service.board()?.summary.total).toBe(1);
    expect(service.board()?.goals).toEqual([]);
  });
  it('keeps failed reads visible and retries without demo data', () => {
    service.load();
    http.expectOne(URL + '/board').flush(null, { status: 500, statusText: 'Server Error' });
    expect(service.error()).toContain('Não foi possível carregar');
    expect(service.board()).toBeNull();
    service.load();
    http.expectOne(URL + '/board').flush({ ...BOARD, goals: [] });
    expect(service.error()).toBeNull();
    expect(service.board()?.goals).toEqual([]);
  });
  it('posts form fields unchanged and closes only after the server accepts them', async () => {
    const page = TestBed.runInInjectionContext(() => new Goals());
    http.expectOne(URL + '/board').flush(BOARD);
    page.openCreateDrawer();
    const pending = page.saveGoal(REQUEST);
    const request = http.expectOne(URL);
    expect(request.request.body).toEqual(REQUEST);
    expect(page.drawerOpen()).toBe(true);
    request.flush(GOAL, { status: 201, statusText: 'Created' });
    await pending;
    expect(page.drawerOpen()).toBe(false);
    http.expectOne(URL + '/board').flush(BOARD);
  });
  it('keeps a rejected form open and displays backend validation', async () => {
    const page = TestBed.runInInjectionContext(() => new Goals());
    http.expectOne(URL + '/board').flush(BOARD);
    page.openCreateDrawer();
    const pending = page.saveGoal(REQUEST);
    http
      .expectOne(URL)
      .flush({ message: 'category is required' }, { status: 400, statusText: 'Bad Request' });
    await pending;
    expect(page.drawerOpen()).toBe(true);
    expect(page.error()).toBe('category is required');
    http.expectNone(URL + '/board');
  });
  it.each(['complete', 'defer'] as const)(
    'delegates %s without sending calculated lifecycle fields',
    async (action) => {
      service.load();
      http.expectOne(URL + '/board').flush(BOARD);
      const pending = service[action](42);
      const request = http.expectOne(URL + '/42/' + action);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      expect(service.board()?.goals[0]).toEqual(GOAL);
      request.flush({ ...GOAL, status: 'COMPLETED' });
      expect(await pending).toBe(true);
      const result = { ...BOARD, goals: [] };
      http.expectOne(URL + '/board').flush(result);
      expect(service.board()).toEqual(result);
    },
  );
  it('uses PUT for edits', async () => {
    const pending = service.update(42, REQUEST);
    const request = http.expectOne(URL + '/42');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(REQUEST);
    request.flush(GOAL);
    expect(await pending).toBe(true);
    http.expectOne(URL + '/board').flush(BOARD);
  });
  it('persists the weekly focus and obtains its saved value from the server', async () => {
    const focus = { focus: 'Estudar', message: 'Um passo por dia' };
    const pending = service.saveFocus('2027-W01', focus);
    const request = http.expectOne(URL + '/focus/2027-W01');
    expect(request.request.method).toBe('PUT');
    request.flush(focus);
    expect(await pending).toBe(true);
    http.expectOne(URL + '/board').flush({ ...BOARD, focus });
    expect(service.board()?.focus).toEqual(focus);
  });
  it('does not repeat a successful POST when refreshing the board fails', async () => {
    const pending = service.create(REQUEST);
    http.expectOne(URL).flush(GOAL);
    expect(await pending).toBe(true);
    http.expectOne(URL + '/board').flush(null, { status: 500, statusText: 'Server Error' });
    service.load();
    http.expectOne(URL + '/board').flush(BOARD);
    http.expectNone(URL);
  });
});
