import rule from './no-raw-interactive-element.js';
import { createRuleTester } from './rule-tester.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-raw-interactive-element', rule, {
  valid: [
    'const save = <Button icon="check" onClick={save}>{label}</Button>;',
    'const close = <IconButton icon="close" label={label} onClick={close} />;',
    'const sheet = <Sheet title={title} onClose={close}>{body}</Sheet>;',
    {
      code: 'export function Button(props) { return <button type="button" {...props} />; }',
      filename: 'apps/pragma/site/src/components/atoms/Button.tsx',
    },
    {
      code: 'export function Sheet(props) { return <dialog ref={open}>{props.children}</dialog>; }',
      filename: 'apps/pragma/site/src/components/molecules/Sheet.tsx',
    },
  ],
  invalid: [
    {
      code: 'const row = <button type="button" onClick={open}>{title}</button>;',
      errors: [{ messageId: 'rawButton' }],
    },
    {
      code: 'const overlay = <dialog ref={open} onClose={close}>{body}</dialog>;',
      errors: [{ messageId: 'rawDialog' }],
    },
    {
      code: 'const overlay = <dialog ref={open}>{body}</dialog>;',
      filename: 'apps/pragma/site/src/components/atoms/Button.tsx',
      errors: [{ messageId: 'rawDialog' }],
    },
    {
      code: 'const toggle = <button type="button" />;',
      filename: 'apps/pragma/site/src/components/molecules/Sheet.tsx',
      options: [{ buttonFiles: ['Toggle.tsx'], dialogFiles: ['Sheet.tsx'] }],
      errors: [{ messageId: 'rawButton' }],
    },
  ],
});
