import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Environment, ENVIRONMENT_TOKEN } from '@birthday/web-shared-util';

export abstract class ApiService {
  protected httpClient: HttpClient = inject(HttpClient);
  protected environment: Environment = inject(ENVIRONMENT_TOKEN);
  protected baseUrl = `${this.environment.baseUrl}/api`;
}
