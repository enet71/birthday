import { afterNextRender, Injectable, Signal, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private readonly rendered: WritableSignal<boolean> = signal(false);

  public readonly isRendered: Signal<boolean> = this.rendered.asReadonly();

  constructor() {
    afterNextRender(() => this.rendered.set(true));
  }

  public get isMobile(): boolean {
    const userAgent: string = navigator.userAgent;
    const regExps: RegExp[] = [/(Android)(.+)(Mobile)/i, /BlackBerry/i, /iPhone|iPod/i, /Opera Mini/i, /IEMobile/i];

    return regExps.some((regExp: RegExp) => userAgent.match(regExp));
  }
}
