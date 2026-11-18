import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { GoogleSignInConfigDto } from '@birthday/shared-models';
import { GoogleAccounts, GoogleCodeClientError, GoogleCodeResponse, GoogleCredentialResponse } from '../types';

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const SCOPES = 'openid email profile';

// Google Identity Services in the browser: the sign-in popup and One Tap. Use it only in the browser.
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly document: Document = inject(DOCUMENT);
  // The script is added once; a failed load is tried again on the next subscription.
  private script: Observable<GoogleAccounts> | null = null;

  public load(): Observable<void> {
    return this.loadScript().pipe(map(() => undefined));
  }

  // Opens the sign-in popup. Emits the authorization code, or completes without emitting when the user closes the popup
  // or denies the consent. Call it while handling a click: browsers block popups opened later.
  public requestCode(clientId: string): Observable<string> {
    return new Observable<string>((subscriber) => {
      const accounts = this.loaded();

      accounts.oauth2
        .initCodeClient({
          client_id: clientId,
          scope: SCOPES,
          ux_mode: 'popup',
          callback: (response: GoogleCodeResponse) => {
            if (response.code) {
              subscriber.next(response.code);
            }
            subscriber.complete();
          },
          error_callback: (error: GoogleCodeClientError) => {
            if (error.type === 'popup_closed') {
              subscriber.complete();
            } else {
              subscriber.error(new Error(`The Google sign-in popup failed: ${error.type}`));
            }
          },
        })
        .requestCode();
    });
  }

  // Shows One Tap and emits the ID token every time the user picks an account. Unsubscribing hides it.
  public promptOneTap(config: GoogleSignInConfigDto): Observable<string> {
    return new Observable<string>((subscriber) => {
      const { id } = this.loaded();

      id.initialize({
        client_id: config.clientId,
        nonce: config.nonce,
        callback: (response: GoogleCredentialResponse) => subscriber.next(response.credential),
        // Signing in always takes a click on the prompt.
        auto_select: false,
        use_fedcm_for_prompt: true,
        itp_support: true,
        context: 'signin',
      });
      id.prompt();

      return () => id.cancel();
    });
  }

  // After signing out, One Tap must not sign the user in again without asking.
  public disableAutoSelect(): void {
    this.windowAccounts()?.id.disableAutoSelect();
  }

  // `shareReplay` subscribes again after an error, so a failed load adds a new script next time.
  private loadScript(): Observable<GoogleAccounts> {
    this.script ??= new Observable<GoogleAccounts>((subscriber) => {
      const script = this.document.createElement('script');

      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        const accounts = this.windowAccounts();

        if (accounts) {
          subscriber.next(accounts);
          subscriber.complete();
        } else {
          subscriber.error(new Error('Google Identity Services did not start'));
        }
      };
      script.onerror = () => {
        script.remove();
        subscriber.error(new Error('Google Identity Services could not be loaded'));
      };
      this.document.head.appendChild(script);
    }).pipe(shareReplay(1));

    return this.script;
  }

  private loaded(): GoogleAccounts {
    const accounts = this.windowAccounts();

    if (!accounts) {
      throw new Error('Google Identity Services is not loaded');
    }
    return accounts;
  }

  private windowAccounts(): GoogleAccounts | null {
    const view = this.document.defaultView as (Window & { google?: { accounts?: GoogleAccounts } }) | null;

    return view?.google?.accounts ?? null;
  }
}
