import { ConfigurableModuleBuilder } from '@nestjs/common';
import { JobsModuleOptions } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<JobsModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
