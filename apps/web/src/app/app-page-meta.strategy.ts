import { DOCUMENT, effect, inject, Injectable, untracked } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleState } from '@birthday/web-shared-i18n';
import {
  APP_DEFAULT_DESCRIPTION,
  APP_DESCRIPTION_DATA_KEY,
  APP_DOCUMENT_TITLE_DATA_KEY,
  APP_LAYOUT,
  APP_NOINDEX_DATA_KEY,
  APP_OPEN_GRAPH_LOCALES,
  APP_SITE_URL,
  APP_STRUCTURED_DATA_DATA_KEY,
} from './app.constants';
import { AppStructuredDataFactory } from './app.interfaces';

const STRUCTURED_DATA_SCRIPT_ID = 'page-structured-data';

// Runs on every navigation on the server and in the browser, so it also owns the per-route SEO tags.
// Route titles stay short for the layout top bar; the document title also carries the app name.
// Titles and descriptions are translation keys, so a language switch applies the tags of the current page again.
@Injectable()
export class AppPageMetaStrategy extends TitleStrategy {
  private readonly title: Title = inject(Title);
  private readonly meta: Meta = inject(Meta);
  private readonly document: Document = inject(DOCUMENT);
  private readonly translator: AppTranslateService = inject(AppTranslateService);
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);
  private snapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();

    effect(() => {
      this.localeState.locale();
      untracked(() => this.snapshot && this.applyPageMeta(this.snapshot));
    });
  }

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    this.snapshot = snapshot;
    this.applyPageMeta(snapshot);
  }

  private applyPageMeta(snapshot: RouterStateSnapshot): void {
    const pageTitle: string | undefined = this.buildTitle(snapshot);
    const documentTitle: string | undefined = this.findRouteData(snapshot.root, APP_DOCUMENT_TITLE_DATA_KEY);

    const title: string = documentTitle
      ? this.translator.translate(documentTitle)
      : pageTitle
        ? `${this.translator.translate(pageTitle)} · ${APP_LAYOUT.appName}`
        : APP_LAYOUT.appName;
    const description: string = this.translator.translate(this.findRouteData(snapshot.root, APP_DESCRIPTION_DATA_KEY) ?? APP_DEFAULT_DESCRIPTION);

    this.title.setTitle(title);
    this.updateSocialTags(title, description);
    this.updateCanonicalUrl(snapshot.url);
    this.updateRobots(snapshot.root);
    this.updateStructuredData(snapshot.root);
  }

  // Link previews in messengers and social networks read these, so they follow the page like the document title.
  private updateSocialTags(title: string, description: string): void {
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ property: 'og:locale', content: APP_OPEN_GRAPH_LOCALES[this.localeState.locale()] });
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

  // The site-wide JSON-LD stays in `index.html`; this script holds only the current page's own markup.
  private updateStructuredData(root: ActivatedRouteSnapshot): void {
    const data: object | undefined = this.findRouteData<AppStructuredDataFactory>(root, APP_STRUCTURED_DATA_DATA_KEY)?.(this.translator);
    let script: HTMLScriptElement | null = this.document.head.querySelector(`#${STRUCTURED_DATA_SCRIPT_ID}`);

    if (!data) {
      script?.remove();
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.id = STRUCTURED_DATA_SCRIPT_ID;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }
}
