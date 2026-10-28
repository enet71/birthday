import { Observable } from 'rxjs';
import { AuthUser } from '../types';

export abstract class AuthClient {
  // Emits the restored user (or `null`) first, then the user after every sign-in and sign-out.
  public abstract userChanges(): Observable<AuthUser | null>;

  // Completes when the page was not opened from a sign-in redirect or the redirect signed the user in; fails otherwise.
  public abstract completeSignIn(): Observable<void>;

  // Leaves the app for the provider's sign-in page.
  public abstract signInWithGoogle(): Observable<void>;

  public abstract signOut(): Observable<void>;
}
