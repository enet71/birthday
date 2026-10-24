import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { APP_LAYOUT } from './app.constants';

// Route titles stay short for the layout top bar; the document title also carries the app name.
@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title: Title = inject(Title);

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle: string | undefined = this.buildTitle(snapshot);

    this.title.setTitle(
      pageTitle ? `${pageTitle} · ${APP_LAYOUT.appName}` : APP_LAYOUT.appName,
    );
  }
}
