import { createRuleTester } from './rule-tester.js';
import rule from './no-discarded-await-before-navigation.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-discarded-await-before-navigation', rule, {
  valid: [
    `function Page() {
       const createSong = useCreateSong();
       async function save() {
         const created = await createSong.mutateAsync(payload);
         navigateTo(\`/catalog/\${created.song.id}\`);
       }
     }`,
    `function Page() {
       const updateSong = useUpdateSong();
       async function save() {
         updateSong.mutate({ id, ...payload });
         navigateTo(\`/catalog/\${id}\`);
       }
     }`,
    `function Login() {
       const login = useLogin();
       async function submit() {
         await login.mutateAsync({ password });
         navigateTo('/catalog');
       }
     }`,
    `function Page() {
       const updateSong = useUpdateSong();
       async function save() {
         await updateSong.mutateAsync({ id, ...payload });
       }
     }`,
    `function Page() {
       const updateSong = useUpdateSong();
       async function save() {
         await updateSong.mutateAsync({ id, ...payload });
         setBanner('saved');
       }
     }`,
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
