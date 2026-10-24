import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { LocalStorageKey } from '../enums';

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  public get localStorage(): Storage | null {
    return this.isBrowser ? localStorage : null;
  }

  public get sessionStorage(): Storage | null {
    return this.isBrowser ? sessionStorage : null;
  }

  public getLocalItem(key: LocalStorageKey): string | null {
    return this.localStorage?.getItem(key) ?? null;
  }

  public setLocalItem(key: LocalStorageKey, value: string): void {
    this.localStorage?.setItem(key, value);
  }

  public removeLocalItem(key: LocalStorageKey): void {
    this.localStorage?.removeItem(key);
  }
}
