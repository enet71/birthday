export interface AppLayoutMenuItem {
  label: string;
  path: string;
  // Material Symbols icon name.
  icon: string;
}

export interface AppLayoutLogo {
  src: string;
  width: number;
  height: number;
}

// The main call to action at the bottom of the sidenav; a link, so the layout stays independent of features.
export interface AppLayoutPrimaryAction {
  label: string;
  // Material Symbols icon name.
  icon: string;
  path: string;
  queryParams?: Record<string, string>;
}

export interface AppLayoutLink {
  label: string;
  path: string;
}

// Small print with the app name, a tagline, and secondary links such as the legal pages.
export interface AppLayoutFooter {
  tagline: string;
  links: AppLayoutLink[];
}

export interface AppLayoutConfig {
  appName: string;
  homePath: string;
  logo: AppLayoutLogo;
  logoSmall: AppLayoutLogo;
  menu: AppLayoutMenuItem[];
  primaryAction?: AppLayoutPrimaryAction;
  footer?: AppLayoutFooter;
}

export interface AppLayoutSearch {
  placeholder: string;
}
