import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_LAYOUT_CONFIG } from '@birthday/web-layout-util';
import { App } from './app';
import { APP_LAYOUT } from './app.constants';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: APP_LAYOUT_CONFIG, useValue: APP_LAYOUT },
      ],
    }).compileComponents();
  });

  it('should render the app layout with the menu', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('ui-app-layout')).toBeTruthy();
    expect(
      compiled.querySelectorAll('ui-app-layout-menu-left-item'),
    ).toHaveLength(APP_LAYOUT.menu.length);
  });
});
