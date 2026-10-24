import { noDirectStateInject } from './no-direct-state-inject.mjs';

export const noDirectStateInjectConfig = {
  files: ['**/*.ts'],
  ignores: ['**/*.controller.ts', '**/*.state.ts', '**/*.listeners.ts', '**/*.spec.ts'],
  plugins: { local: { rules: { 'no-direct-state-inject': noDirectStateInject } } },
  rules: { 'local/no-direct-state-inject': 'error' },
};
