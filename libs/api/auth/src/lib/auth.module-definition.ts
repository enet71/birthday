import { ConfigurableModuleBuilder } from '@nestjs/common';
import { AuthModuleOptions } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<AuthModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
