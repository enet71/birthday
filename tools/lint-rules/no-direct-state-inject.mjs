export const noDirectStateInject = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow injecting a *State class directly outside its paired *.controller.ts; use injectState() from @birthday/shared-data-access instead.',
    },
    schema: [],
    messages: {
      noDirectInject:
        "Do not inject '{{name}}' directly here — only the paired *.controller.ts may write to it. Use injectState({{name}}) to read it.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'Identifier' || callee.name !== 'inject') {
          return;
        }

        const arg = node.arguments[0];
        if (!arg || arg.type !== 'Identifier' || !/State$/.test(arg.name)) {
          return;
        }

        context.report({ node, messageId: 'noDirectInject', data: { name: arg.name } });
      },
    };
  },
};
