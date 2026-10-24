import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  public get isMobile(): boolean {
    const userAgent: string = navigator.userAgent;
    const regExps: RegExp[] = [
      /(Android)(.+)(Mobile)/i,
      /BlackBerry/i,
      /iPhone|iPod/i,
      /Opera Mini/i,
      /IEMobile/i,
    ];

    return regExps.some((regExp: RegExp) => userAgent.match(regExp));
  }
}
