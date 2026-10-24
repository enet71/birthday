import { Injector } from '@angular/core';

export interface AppLayoutMenuItem {
  name: string;
  path?: string;
  // Material Symbols icon name.
  icon: string;
  description?: string;
  children?: AppLayoutMenuItem[];
}

export interface AppLayoutLogo {
  src: string;
  width: number;
  height: number;
}

export interface AppLayoutConfig {
  homePath: string;
  logo: AppLayoutLogo;
  logoSmall: AppLayoutLogo;
  menu: AppLayoutMenuItem[];
}

export interface Breadcrumb {
  id: string;
  title: string;
  navigate?: (injector: Injector) => void;
}
