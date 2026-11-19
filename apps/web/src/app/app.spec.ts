import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NEVER, of } from 'rxjs';
import { AuthApiService, GoogleIdentityService } from '@birthday/web-auth-data-access';
import { APP_LAYOUT_CONFIG } from '@birthday/web-layout-util';
import { App } from './app';
import { APP_LAYOUT } from './app.constants';
import en from '../i18n/en.json';

describe('App', () => {
  beforeEach(async () => {
    // jsdom has no `matchMedia`; the theme controller watches the system color scheme through it.
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

    await TestBed.configureTestingModule({
      imports: [
        App,
        TranslocoTestingModule.forRoot({ langs: { en }, preloadLangs: true, translocoConfig: { availableLangs: ['en'], defaultLang: 'en' } }),
      ],
      providers: [
        provideRouter([]),
        { provide: APP_LAYOUT_CONFIG, useValue: APP_LAYOUT },
        // The account button in the top bar reads the signed-in user; signed out, the app also prepares Google sign-in.
        {
          provide: AuthApiService,
          useValue: { userChanges: () => of(null), getGoogleSignInConfig: () => of({ clientId: 'client-id', nonce: 'nonce' }) },
        },
        { provide: GoogleIdentityService, useValue: { load: () => of(undefined), promptOneTap: () => NEVER } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render the app layout with the menu', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('ui-app-layout')).toBeTruthy();
    expect(compiled.querySelectorAll('ui-app-layout-sidenav a[mat-list-item]')).toHaveLength(APP_LAYOUT.menu.length);
  });
});
