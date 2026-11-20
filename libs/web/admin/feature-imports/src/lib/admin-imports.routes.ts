import { Route } from '@angular/router';
import { AdminImportsPageComponent } from './components';
import { AdminImportsController, AdminImportsState } from './state';

export const ADMIN_IMPORTS_ROUTES: Route[] = [
  {
    path: '',
    component: AdminImportsPageComponent,
    providers: [AdminImportsState, AdminImportsController],
  },
];
