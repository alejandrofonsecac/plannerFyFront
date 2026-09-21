import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/data-access/api-client.service';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CalendarEvent, CalendarEventDraft } from '../models';

@Injectable({
  providedIn: 'root',
})
export class CalendarEventsService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL).replace(/\/+$/, '') + '/events';

  getEvents(): Observable<CalendarEvent[]> {
    return this.httpClient.get<CalendarEvent[]>(this.apiUrl);
  }

  createEvent(event: CalendarEventDraft): Observable<CalendarEvent> {
    return this.httpClient.post<CalendarEvent>(this.apiUrl, event);
  }

  updateEvent(id: CalendarEvent['id'], event: CalendarEventDraft): Observable<CalendarEvent> {
    return this.httpClient.put<CalendarEvent>(`${this.apiUrl}/${id}`, event);
  }

  deleteEvent(id: CalendarEvent['id']): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/${id}`);
  }
}
