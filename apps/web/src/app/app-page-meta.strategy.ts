import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import {
  APP_DEFAULT_DESCRIPTION,
  APP_DESCRIPTION_DATA_KEY,
  APP_DOCUMENT_TITLE_DATA_KEY,
  APP_LAYOUT,
  APP_NOINDEX_DATA_KEY,
  APP_SITE_URL,
} from './app.constants';

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

    const title: string = documentTitle ?? (pageTitle ? `${pageTitle} · ${APP_LAYOUT.appName}` : APP_LAYOUT.appName);
    const description: string = this.findRouteData(snapshot.root, APP_DESCRIPTION_DATA_KEY) ?? APP_DEFAULT_DESCRIPTION;

    this.title.setTitle(title);
    this.updateSocialTags(title, description);
    this.updateCanonicalUrl(snapshot.url);
    this.updateRobots(snapshot.root);
  }

  // Link previews in messengers and social networks read these, so they follow the page like the document title.
  private updateSocialTags(title: string, description: string): void {
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
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
