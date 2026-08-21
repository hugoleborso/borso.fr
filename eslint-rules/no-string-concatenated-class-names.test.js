import { createRuleTester } from './rule-tester.js';
import rule from './no-string-concatenated-class-names.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-string-concatenated-class-names', rule, {
  valid: [
    'const row = <div className="flex items-center gap-2" />;',
    'const row = <div className={clsx("flex", isActive && "bg-accent")} />;',
    'const row = <div className={cn("flex", className)} />;',
    'const action = <button className={buttonVariants({ variant, size })} />;',
    'const row = <div className={containerClassName} />;',
    'const row = <div className={props.className} />;',
    'const chip = <span className={isActive ? "bg-accent" : "bg-transparent"} />;',
    'const chip = <span className={isActive && "bg-accent"} />;',
    'const link = <a href={`/songs/${songId}`}>{title}</a>;',
    'const field = <input id={`field-${name}`} className="h-10" />;',
    'const image = <img alt={`Portrait of ${runnerName}`} />;',
    'const field = <input disabled />;',
  ],
  invalid: [
    {
      code: 'const chip = <span className={`bg-${colour}-500 px-2`} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    {
      code: 'const chip = <span className={"px-" + size} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    {
      code: 'const row = <div className={`flex ${extraClassName}`} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    {
      code: 'const chip = <span className={isActive ? `bg-${colour}` : "bg-transparent"} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    {
      code: 'const chip = <span className={isActive && `ring-${width}`} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    {
      code: 'const row = <div className={`flex items-center`} />;',
      errors: [{ messageId: 'staticTemplateClassName' }],
    },
  ],
});

createRuleTester('infra/cdk/src/constructs/report.tsx').run(
  'no-string-concatenated-class-names (outside a site)',
  rule,
  {
    valid: ['const row = <div className={`bg-${colour}`} />;'],
    invalid: [],
  },
);
