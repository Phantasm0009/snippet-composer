const assert = require('assert');
const { applyVariableTransform, replaceTemplateVariables } = require('../out/variableTransforms');

function run() {
  assert.strictEqual(applyVariableTransform('my component', 'pascalcase'), 'MyComponent');
  assert.strictEqual(applyVariableTransform('MyComponent', 'snakecase'), 'my_component');
  assert.strictEqual(applyVariableTransform('MyComponent', 'kebabcase'), 'my-component');
  assert.strictEqual(applyVariableTransform('MyComponent', 'dotcase'), 'my.component');
  assert.strictEqual(applyVariableTransform('MyComponent', 'pathcase'), 'my/component');
  assert.strictEqual(applyVariableTransform('city', 'pluralize'), 'cities');
  assert.strictEqual(applyVariableTransform('users', 'singularize'), 'user');

  const conditional = replaceTemplateVariables(
    'Hello {{#if Name}}{{Name}}{{/if}}{{#if Empty}}!{{/if}}',
    { Name: 'World', Empty: '' }
  );
  assert.strictEqual(conditional, 'Hello World');

  console.log('All tests passed');
}

run();
