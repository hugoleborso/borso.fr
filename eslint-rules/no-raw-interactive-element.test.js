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
      code: "import { Dialog, Modal, ModalOverlay } from 'react-aria-components';",
      filename: 'apps/pragma/site/src/components/molecules/Sheet.tsx',
    },
    {
      code: "import { MenuTrigger, Popover } from 'react-aria-components';",
      filename: 'apps/pragma/site/src/components/molecules/Menu.tsx',
    },
    "import { Checkbox, ToggleButton } from 'react-aria-components';",
    "import { Dialog } from './Dialog';",
    "import * as Aria from 'react-aria-components';",
    {
      code: "import { Popover } from 'react-aria-components';",
      filename: 'apps/pragma/site/src/components/molecules/Picker.tsx',
      options: [{ overlayFiles: ['Picker.tsx'] }],
    },
    'const mark = <span aria-hidden="true" className="dot" />;',
    'const item = <Menu.Item onClick={open}>{title}</Menu.Item>;',
    'const row = <div aria-hidden="false" onClick={open}>{title}</div>;',
    'const row = <div aria-hidden={false} onClick={open}>{title}</div>;',
    'const row = <div aria-hidden={isHidden} onClick={open}>{title}</div>;',
    'const row = <div {...props} aria-hidden="true" />;',
  ],
  invalid: [
    {
      code: 'const backdrop = <div data-menu-backdrop aria-hidden="true" onClick={close} className="fixed inset-0" />;',
      errors: [{ messageId: 'hiddenClickTarget' }],
    },
    {
      code: 'const backdrop = <div aria-hidden onPointerDown={close} />;',
      errors: [{ messageId: 'hiddenClickTarget' }],
    },
    {
      code: 'const backdrop = <div aria-hidden={true} onTouchEnd={close} />;',
      errors: [{ messageId: 'hiddenClickTarget' }],
    },
    {
      code: 'const row = <button type="button" onClick={open}>{title}</button>;',
      errors: [{ messageId: 'rawButton' }],
    },
    {
      code: 'const overlay = <dialog ref={open} onClose={close}>{body}</dialog>;',
      errors: [{ messageId: 'rawDialog' }],
    },
    {
      code: 'export function Sheet(props) { return <dialog ref={open}>{props.children}</dialog>; }',
      filename: 'apps/pragma/site/src/components/molecules/Sheet.tsx',
      errors: [{ messageId: 'rawDialog' }],
    },
    {
      code: "import { Button, Modal, ModalOverlay } from 'react-aria-components';",
      filename: 'apps/pragma/site/src/components/organisms/PickerSheet.tsx',
      errors: [{ messageId: 'libraryOverlay' }, { messageId: 'libraryOverlay' }],
    },
    {
      code: "import { Popover as Floating } from 'react-aria-components';",
      errors: [{ messageId: 'libraryOverlay' }],
    },
    {
      code: "import { Dialog } from 'react-aria-components';",
      filename: 'apps/pragma/site/src/components/molecules/Menu.tsx',
      options: [{ overlayFiles: ['Sheet.tsx'] }],
      errors: [{ messageId: 'libraryOverlay' }],
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
