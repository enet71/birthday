import { ConfigurableModuleBuilder } from '@nestjs/common';
import { GoogleCalendarModuleOptions } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<GoogleCalendarModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
