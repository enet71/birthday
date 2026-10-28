import { DOCUMENT, inject, Injectable } from '@angular/core';
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { Session } from '@supabase/supabase-js';
import { AuthClient, AuthUser } from '@birthday/web-auth-data-access';
import { SUPABASE_CLIENT, SupabaseDatabaseClient } from '../client';
import { fromSupabase } from '../helpers';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthClient extends AuthClient {
  private readonly supabase: SupabaseDatabaseClient = inject(SUPABASE_CLIENT);
  private readonly document: Document = inject(DOCUMENT);

  public userChanges(): Observable<AuthUser | null> {
    return new Observable<AuthUser | null>((subscriber) => {
      // The first event is `INITIAL_SESSION` with the restored session.
      const { data } = this.supabase.auth.onAuthStateChange((_event, session: Session | null) =>
        subscriber.next(session ? { id: session.user.id, email: session.user.email ?? null } : null),
      );

      return () => data.subscription.unsubscribe();
    }).pipe(
      // Token refreshes emit the same user again.
      distinctUntilChanged(
        (previous: AuthUser | null, current: AuthUser | null) => previous?.id === current?.id && previous?.email === current?.email,
      ),
    );
  }

  // `initialize()` is memoized and is the only place that reports a failed redirect (for example, cancelled consent);
  // `onAuthStateChange` just emits a signed-out user then.
  public completeSignIn(): Observable<void> {
    return fromSupabase(() => this.supabase.auth.initialize()).pipe(map(() => undefined));
  }

  public signInWithGoogle(): Observable<void> {
    return fromSupabase(() => this.supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: this.redirectUrl } })).pipe(
      map(() => undefined),
    );
  }

  public signOut(): Observable<void> {
    return fromSupabase(() => this.supabase.auth.signOut()).pipe(map(() => undefined));
  }

  // Returns the user to the page where sign-in started. Must match the project's allowed redirect URLs.
  private get redirectUrl(): string {
    return `${this.document.location.origin}${this.document.location.pathname}`;
  }
}
