import { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { parseBornDate } from '../helpers';

// An unknown month or a day the month lacks does not match, so the router falls through to the not-found page.
export const bornDateGuard: CanMatchFn = (_route: Route, segments: UrlSegment[]) => parseBornDate(segments[0]?.path, segments[1]?.path) !== null;
