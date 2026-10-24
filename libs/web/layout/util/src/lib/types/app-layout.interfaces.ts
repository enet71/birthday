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

export interface AppLayoutConfig {
  appName: string;
  homePath: string;
  logo: AppLayoutLogo;
  logoSmall: AppLayoutLogo;
  menu: AppLayoutMenuItem[];
}

export interface AppLayoutSearch {
  placeholder: string;
}
