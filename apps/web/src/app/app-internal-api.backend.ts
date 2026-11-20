import { FetchBackend, HttpBackend, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_PATH_PREFIX = '/api/';

// Server rendering only: sends the API requests of a page straight to the API container instead of out through the
// public domain and back. It sits behind every interceptor, so the transfer cache keeps the browser's relative URLs as
// keys and the browser does not repeat the requests while hydrating.
export class AppInternalApiBackend implements HttpBackend {
  constructor(
    private readonly fetchBackend: FetchBackend,
    // For example `http://api:3000`.
    private readonly apiOrigin: string,
    // The rendered page's origin, which Angular's server platform puts before relative URLs.
    private readonly pageOrigin: string,
  ) {}

  public handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    // Angular's server platform has already made relative URLs absolute against the page's address; other sites' URLs
    // stay untouched.
    const url = new URL(request.url, this.pageOrigin);

    if (url.origin !== this.pageOrigin || !url.pathname.startsWith(API_PATH_PREFIX)) {
      return this.fetchBackend.handle(request);
    }

    return this.fetchBackend.handle(request.clone({ url: new URL(`${url.pathname}${url.search}`, this.apiOrigin).toString() }));
  }
}
