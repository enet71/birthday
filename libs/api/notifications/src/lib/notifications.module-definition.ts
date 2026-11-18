import { ConfigurableModuleBuilder } from '@nestjs/common';
import { NotificationsModuleOptions } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<NotificationsModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
