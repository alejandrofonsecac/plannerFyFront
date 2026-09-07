import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HomeDashboardService } from './service/home-dashboard.service';
import { WeeklyGoalsCard } from './components/weekly-goals-card/weekly-goals-card';

@Component({
  selector: 'app-home',
  imports: [MatIconModule, RouterLink, WeeklyGoalsCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly dashboardService = inject(HomeDashboardService);
  readonly dashboard = this.dashboardService.dashboard;
  readonly weatherLoading = this.dashboardService.weatherLoading;
  readonly weatherError = this.dashboardService.weatherError;
  readonly searchQuery = signal('');
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly searchStatus = computed(() =>
    this.searchQuery().trim()
      ? `A pesquisa por “${this.searchQuery().trim()}” está pronta para ser conectada aos seus dados.`
      : '',
  );

  ngOnInit(): void {
    this.dashboardService.load();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchInput()?.nativeElement.focus();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.clearSearch();
    }
  }
}
