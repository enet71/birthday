import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { APP_DOCUMENT_TITLE_DATA_KEY, APP_LAYOUT, APP_NOINDEX_DATA_KEY, APP_SITE_URL } from './app.constants';

// Runs on every navigation on the server and in the browser, so it also owns the per-route SEO tags.
// Route titles stay short for the layout top bar; the document title also carries the app name.
@Injectable()
export class AppPageMetaStrategy extends TitleStrategy {
  private readonly title: Title = inject(Title);
  private readonly meta: Meta = inject(Meta);
  private readonly document: Document = inject(DOCUMENT);

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle: string | undefined = this.buildTitle(snapshot);
    const documentTitle: string | undefined = this.findRouteData(snapshot.root, APP_DOCUMENT_TITLE_DATA_KEY);

    this.title.setTitle(documentTitle ?? (pageTitle ? `${pageTitle} · ${APP_LAYOUT.appName}` : APP_LAYOUT.appName));
    this.updateCanonicalUrl(snapshot.url);
    this.updateRobots(snapshot.root);
  }

  private findRouteData<T>(root: ActivatedRouteSnapshot, key: string): T | undefined {
    let route: ActivatedRouteSnapshot | null = root;

    while (route && route.data[key] === undefined) {
      route = route.firstChild;
    }

    return route?.data[key];
  }

  private updateCanonicalUrl(url: string): void {
    const canonicalUrl = `${APP_SITE_URL}${url.split(/[?#]/)[0]}`;
    let link: HTMLLinkElement | null = this.document.head.querySelector('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }

    link.href = canonicalUrl;
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
  }

  private updateRobots(root: ActivatedRouteSnapshot): void {
    if (this.findRouteData<boolean>(root, APP_NOINDEX_DATA_KEY)) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }
  }
}
