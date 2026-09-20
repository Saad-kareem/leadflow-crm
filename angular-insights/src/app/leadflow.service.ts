import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { API_URL, Envelope, Meta, Summary } from './leadflow';

const TOKEN_KEY = 'leadflow.insights.token';

/**
 * Talks to the LeadFlow API.
 *
 * Authentication is deliberately simplified for this read-only view, as the
 * brief allows: the same `POST /api/auth/login` endpoint as the React
 * dashboard, with the JWT kept in `sessionStorage` so it lasts the tab and no
 * longer. It is not a second session system — it is the same endpoint with a
 * smaller surface.
 */
@Injectable({ providedIn: 'root' })
export class LeadflowService {
  private readonly http = inject(HttpClient);

  /** Exposed as a signal so the template can react without a subscription. */
  readonly token = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));

  signIn(email: string, password: string): Observable<void> {
    return this.http
      .post<Envelope<{ token: string }>>(`${API_URL}/api/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          sessionStorage.setItem(TOKEN_KEY, response.data.token);
          this.token.set(response.data.token);
        }),
        map(() => undefined),
        catchError(this.toReadableError),
      );
  }

  signOut(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  summary(): Observable<Summary> {
    return this.http
      .get<Envelope<Summary>>(`${API_URL}/api/stats/summary`, { headers: this.authHeaders() })
      .pipe(
        map((response) => response.data),
        catchError(this.toReadableError),
      );
  }

  /** Labels for statuses and services, so this view does not hard-code them. */
  meta(): Observable<Meta> {
    return this.http
      .get<Envelope<Meta>>(`${API_URL}/api/meta`)
      .pipe(
        map((response) => response.data),
        catchError(this.toReadableError),
      );
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token() ?? ''}` });
  }

  /**
   * Turns any failure into one sentence a person can act on.
   *
   * `HttpErrorResponse.message` is a developer string — it reads "Http failure
   * response for http://localhost:4000/…: 0 Unknown Error" — and has no place
   * on a screen.
   */
  private readonly toReadableError = (error: HttpErrorResponse) => {
    if (error.status === 0) {
      return throwError(
        () => new Error("We couldn't reach the API. Check that it is running on port 4000."),
      );
    }

    if (error.status === 401) {
      this.signOut();
      return throwError(() => new Error('Those details do not match an account.'));
    }

    return throwError(() => new Error(error.error?.message ?? 'Something went wrong. Please try again.'));
  };
}
