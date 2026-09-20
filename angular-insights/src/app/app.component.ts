import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeadflowService } from './leadflow.service';
import { MetaOption, StatusCounts, Summary, TopLead } from './leadflow';

interface StatusRow {
  key: keyof StatusCounts;
  label: string;
  count: number;
  share: number;
}

/**
 * Lead Insights — a read-only view over the same API the React dashboard uses.
 *
 * Standalone, one component, signals for state. Kept deliberately small: it
 * shows the total, the counts by status and the top five by score, which is
 * what the brief asks for and no more.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly api = inject(LeadflowService);

  readonly signedIn = computed(() => this.api.token() !== null);

  readonly email = signal('admin@leadflow.test');
  readonly password = signal('');
  readonly signingIn = signal(false);
  readonly signInError = signal('');

  readonly summary = signal<Summary | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  private statusLabels = signal<MetaOption[]>([]);
  private serviceLabels = signal<MetaOption[]>([]);

  /**
   * Counts by status, with the share each one represents.
   *
   * Derived rather than stored, so it cannot drift out of step with the
   * summary it is computed from.
   */
  readonly statusRows = computed<StatusRow[]>(() => {
    const data = this.summary();
    if (!data) return [];

    return (Object.keys(data.byStatus) as (keyof StatusCounts)[]).map((key) => ({
      key,
      label: this.labelFor(this.statusLabels(), key),
      count: data.byStatus[key],
      share: data.total ? Math.round((data.byStatus[key] / data.total) * 100) : 0,
    }));
  });

  constructor() {
    if (this.signedIn()) this.load();
    this.api.meta().subscribe({
      next: (meta) => {
        this.statusLabels.set(meta.statuses);
        this.serviceLabels.set(meta.services);
      },
      // Labels are a nicety; the page still works with the raw slugs.
      error: () => undefined,
    });
  }

  signIn(): void {
    this.signingIn.set(true);
    this.signInError.set('');

    this.api.signIn(this.email(), this.password()).subscribe({
      next: () => {
        this.signingIn.set(false);
        this.password.set('');
        this.load();
      },
      error: (failure: Error) => {
        this.signingIn.set(false);
        this.signInError.set(failure.message);
      },
    });
  }

  signOut(): void {
    this.api.signOut();
    this.summary.set(null);
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (failure: Error) => {
        this.error.set(failure.message);
        this.loading.set(false);
      },
    });
  }

  serviceLabel(lead: TopLead): string {
    return this.labelFor(this.serviceLabels(), lead.service);
  }

  statusLabel(status: string): string {
    return this.labelFor(this.statusLabels(), status);
  }

  private labelFor(options: MetaOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value;
  }
}
