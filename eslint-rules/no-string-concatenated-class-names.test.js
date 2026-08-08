import { createRuleTester } from './rule-tester.js';
import rule from './no-string-concatenated-class-names.js';

createRuleTester().run('no-string-concatenated-class-names', rule, {
  valid: [
    // The common case.
    'const row = <div className="flex items-center gap-2" />;',
    // The sanctioned forms.
    'const row = <div className={clsx("flex", isActive && "bg-accent")} />;',
    'const row = <div className={cn("flex", className)} />;',
    'const action = <button className={buttonVariants({ variant, size })} />;',
    // A variable and a member expression.
    'const row = <div className={containerClassName} />;',
    'const row = <div className={props.className} />;',
    // A conditional between two literals, which the scanner finds on both
    // sides.
    'const chip = <span className={isActive ? "bg-accent" : "bg-transparent"} />;',
    'const chip = <span className={isActive && "bg-accent"} />;',
    // Every other attribute, including the ones that legitimately interpolate.
    'const link = <a href={`/songs/${songId}`}>{title}</a>;',
    'const field = <input id={`field-${name}`} className="h-10" />;',
    'const image = <img alt={`Portrait of ${runnerName}`} />;',
    // An attribute with no value at all.
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
    // Assembled inside one branch of a conditional, which the rule looks
    // through because neither branch defers a value.
    {
      code: 'const chip = <span className={isActive ? `bg-${colour}` : "bg-transparent"} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    {
      code: 'const chip = <span className={isActive && `ring-${width}`} />;',
      errors: [{ messageId: 'assembledClassName' }],
    },
    // A template literal with nothing to interpolate, whose fix is a plain
    // string rather than `clsx`.
    {
      code: 'const row = <div className={`flex items-center`} />;',
      errors: [{ messageId: 'staticTemplateClassName' }],
    },
  ],
});

// Styling is a front end concern, so the rule reads the file name.
createRuleTester('infra/cdk/src/constructs/report.tsx').run(
  'no-string-concatenated-class-names (outside a site)',
  rule,
  {
    valid: ['const row = <div className={`bg-${colour}`} />;'],
    invalid: [],
  },
);
