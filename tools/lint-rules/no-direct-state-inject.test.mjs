import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { noDirectStateInject } from './no-direct-state-inject.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
  },
});

ruleTester.run('no-direct-state-inject', noDirectStateInject, {
  valid: ['inject(ItemController)', 'injectState(ItemState)', 'const x = inject(SomeOtherService);'],
  invalid: [
    {
      code: 'const state = inject(ItemState);',
      errors: [{ messageId: 'noDirectInject', data: { name: 'ItemState' } }],
    },
    {
      code: 'class C { private readonly state: ItemDetailsState = inject(ItemDetailsState); }',
      errors: [{ messageId: 'noDirectInject', data: { name: 'ItemDetailsState' } }],
    },
  ],
});

console.log('no-direct-state-inject: all RuleTester cases passed.');
