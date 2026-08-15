import { createRuleTester } from './rule-tester.js';
import rule from './no-discarded-await-before-navigation.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-discarded-await-before-navigation', rule, {
  valid: [
    // The awaited value is used, which is the whole reason to wait: a create
    // navigates to a route keyed by the id only the server can issue.
    `function Page() {
       const createSong = useCreateSong();
       async function save() {
         const created = await createSong.mutateAsync(payload);
         navigateTo(\`/catalog/\${created.song.id}\`);
       }
     }`,
    // Fired and not awaited, which is the shape the rule steers towards.
    `function Page() {
       const updateSong = useUpdateSong();
       async function save() {
         updateSong.mutate({ id, ...payload });
         navigateTo(\`/catalog/\${id}\`);
       }
     }`,
    // A login has no optimistic cache standing in for the session, and a wrong
    // password has to keep the operator on the form.
    `function Login() {
       const login = useLogin();
       async function submit() {
         await login.mutateAsync({ password });
         navigateTo('/catalog');
       }
     }`,
    // Awaited and discarded, but nothing follows: the operator is still here.
    `function Page() {
       const updateSong = useUpdateSong();
       async function save() {
         await updateSong.mutateAsync({ id, ...payload });
       }
     }`,
    // Awaited and discarded, and the next statement is not a navigation.
    `function Page() {
       const updateSong = useUpdateSong();
       async function save() {
         await updateSong.mutateAsync({ id, ...payload });
         setBanner('saved');
       }
     }`,
    // An unresolvable receiver is left alone rather than guessed at.
    `async function save() {
       await someImportedThing.mutateAsync(payload);
       navigateTo('/catalog');
     }`,
  ],
  invalid: [
    {
      code: `function Page() {
               const updateSong = useUpdateSong();
               async function save() {
                 await updateSong.mutateAsync({ id, ...payload });
                 navigateTo(\`/catalog/\${id}\`);
               }
             }`,
      errors: [{ messageId: 'discardedAwait' }],
    },
    {
      code: `function Page() {
               const deleteSong = useDeleteSong();
               async function remove() {
                 await deleteSong.mutateAsync({ id });
                 navigate('/catalog', { replace: true });
               }
             }`,
      errors: [{ messageId: 'discardedAwait' }],
    },
    {
      code: `function Page() {
               const updateEntry = useUpdateSetlistEntry();
               async function save() {
                 await updateEntry.mutateAsync(entry);
                 await router.push('/setlists');
               }
             }`,
      errors: [{ messageId: 'discardedAwait' }],
    },
  ],
});
