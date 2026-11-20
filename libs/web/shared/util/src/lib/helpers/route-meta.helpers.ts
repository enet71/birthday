import { ActivatedRouteSnapshot } from '@angular/router';
import { AppRouteText, AppRouteTranslator } from '../types';

export function translateRouteText(text: AppRouteText, translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  return typeof text === 'function' ? text(translator, route) : translator.translate(text);
}
