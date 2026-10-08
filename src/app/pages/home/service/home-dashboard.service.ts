import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiClient } from '../../../core/data-access/api-client.service';
import type { PlannerDayAvailability, PlannerEvent } from '@pages/schedule/models';
import { PlannerViewService } from '@app/shared/planner-view.service';
import { parseLocalDate, toMinutes } from '@pages/schedule/utils';
import type { WeatherResponse } from '../models/weather';
import { WeatherService } from './weather/weatherService.service';

export type HomeTimeSegmentStatus = 'busy' | 'attention' | 'free' | 'unknown';

interface BackendDashboard {
  date: string;
  planner: {
    availability: PlannerDayAvailability;
    events: PlannerEvent[];
  };
  focus: { id: number; title: string; description: string | null; progress: number } | null;
  habits: {
    id: number;
    icon: string;
    name: string;
    completed: number;
    target: number;
    progress: number;
  }[];
  summary: { completedEvents: number; totalEvents: number; highestCurrentStreak: number };
}

export interface HomeDashboardData {
  appName: string;
  pageName: string;
  profile: { initials: string; name: string | null };
  welcome: { eyebrow: string; title: string; description: string };
  day: {
    weekday: string;
    number: string;
    month: string;
    weatherIcon: string;
    temperature: string | null;
    city: string | null;
    weatherCondition: string | null;
    greeting: string | null;
  };
  availableTime: {
    label: string;
    value: string | null;
    description: string | null;
    segments: { id: number; status: HomeTimeSegmentStatus; label: string }[];
  };
  focus: {
    label: string;
    title: string | null;
    description: string | null;
    progressLabel: string;
    progress: number | null;
    actionLabel: string;
  };
  agenda: {
    title: string;
    countLabel: string | null;
    events: { id: string; time: string; title: string; category: string; tone: string }[];
  };
  habits: {
    title: string;
    todayLabel: string;
    emptyLabel: string;
    items: { id: number; icon: string; name: string; value: string; progress: number }[];
  };
  daySummary: {
    title: string;
    expandLabel: string;
    metrics: { id: number; icon: string; value: string | null; label: string }[];
  };
}

const WEATHER_ICONS: Record<string, string> = {
  'Céu limpo': 'wb_sunny',
  'Parcialmente nublado': 'partly_cloudy_day',
  Nublado: 'cloud',
  Chuva: 'rainy',
};

function tone(category: string): string {
  return category === 'personal'
    ? 'personal'
    : category === 'health' || category === 'habit'
      ? 'wellbeing'
      : 'work';
}

function dashboard(
  data: BackendDashboard | null,
  weather: WeatherResponse | null,
  isSleepHour: (hour: number) => boolean,
): HomeDashboardData {
  const date = (data ? parseLocalDate(data.date) : null) ?? new Date();
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
  const availability = data?.planner.availability;
  // Free sleep hours are not available time; busy ones stay so no commitment disappears.
  const slots = (availability?.slots ?? []).filter(
    (slot) => !slot.available || !isSleepHour(toMinutes(slot.startTime) / 60),
  );
  const hidesSleep = !!availability && slots.length < availability.slots.length;
  const availableBlocks = slots.filter((slot) => slot.available).length;
  
  return {
    appName: 'PlannerFy',
    pageName: 'Início',
    profile: { initials: '—', name: null },
    welcome: {
      eyebrow: 'ESPAÇO PESSOAL',
      title: 'Um dia de cada vez.',
      description: 'Uma visão calma do que importa agora, sem perder de vista o seu ritmo.',
    },
    day: {
      weekday: weekday[0].toUpperCase() + weekday.slice(1),
      number: String(date.getDate()).padStart(2, '0'),
      month: month[0].toUpperCase() + month.slice(1),
      weatherIcon: weather ? (WEATHER_ICONS[weather.condition] ?? 'cloud') : 'cloud_off',
      temperature: weather ? `${weather.temperature} °C` : null,
      city: weather?.city ?? null,
      weatherCondition: weather?.condition ?? null,
      greeting: null,
    },
    availableTime: {
      label: 'TEMPO DISPONÍVEL',
      value: availability ? `${hidesSleep ? availableBlocks : availability.availableHours}h` : null,
      description: availability
        ? hidesSleep
          ? `${availableBlocks} de ${slots.length} blocos livres`
          : `${availability.availableBlocks} de ${availability.totalBlocks} blocos livres`
        : null,
      segments: availability
        ? slots.map((slot, index) => ({
            id: index + 1,
            status: slot.available ? 'free' : 'busy',
            label: `${slot.startTime} a ${slot.endTime}`,
          }))
        : [],
    },
    focus: {
      label: 'FOCO DE HOJE',
      title: data?.focus?.title ?? null,
      description: data?.focus?.description ?? null,
      progressLabel: 'Progresso',
      progress: data?.focus?.progress ?? null,
      actionLabel: 'Abrir eventos',
    },
    agenda: {
      title: 'Agenda de hoje',
      countLabel: data ? `${data.planner.events.length} eventos` : null,
      events: (data?.planner.events ?? []).map((event) => ({
        id: String(event.id),
        time: event.startTime ?? 'Sem horário',
        title: event.title,
        category: event.category,
        tone: tone(event.category),
      })),
    },
    habits: {
      title: 'Hábitos',
      todayLabel: 'Hoje',
      emptyLabel: data ? 'Nenhum hábito para hoje' : 'Hábitos indisponíveis',
      items: (data?.habits ?? []).map((habit) => ({
        id: habit.id,
        icon: habit.icon,
        name: habit.name,
        value: `${habit.completed}/${habit.target}`,
        progress: habit.progress,
      })),
    },
    daySummary: {
      title: 'Resumo do dia',
      expandLabel: 'Ver resumo completo',
      metrics: [
        {
          id: 1,
          icon: 'task_alt',
          value: data ? `${data.summary.completedEvents}/${data.summary.totalEvents}` : null,
          label: 'eventos concluídos',
        },
        { id: 2, icon: 'psychology', value: null, label: 'foco profundo' },
        {
          id: 3,
          icon: 'local_fire_department',
          value: data ? String(data.summary.highestCurrentStreak) : null,
          label: 'dias de sequência',
        },
      ],
    },
  };
}

@Injectable({ providedIn: 'root' })
export class HomeDashboardService {
  private readonly api = inject(ApiClient);
  private readonly weatherService = inject(WeatherService);
  private pending?: Subscription;
  private readonly backendData = signal<BackendDashboard | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  private readonly plannerView = inject(PlannerViewService);
  readonly dashboard = computed(() =>
    dashboard(this.backendData(), this.weatherService.weather(), (hour) =>
      this.plannerView.isSleepHour(hour),
    ),
  );
  readonly weatherLoading = this.weatherService.loading;
  readonly weatherError = this.weatherService.error;

  load(): void {
    this.weatherService.load();
    this.pending?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pending = this.api.get<BackendDashboard>('home/dashboard').subscribe({
      next: (value) => {
        this.backendData.set(value);
        this.loading.set(false);
      },
      error: () => {
        this.backendData.set(null);
        this.loading.set(false);
        this.error.set('Não foi possível carregar o resumo. Tente novamente.');
      },
    });
  }
}
