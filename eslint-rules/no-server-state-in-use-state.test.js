import { createRuleTester } from './rule-tester.js';
import rule from './no-server-state-in-use-state.js';

createRuleTester().run('no-server-state-in-use-state', rule, {
  valid: [
    // The replacement.
    'const { data } = useQuery({ queryKey: ["songs"], queryFn: () => api.api.songs.$get() });',
    // An effect that sets state without reading the server. `no-use-effect`
    // covers this one, and naming TanStack Query here would be wrong advice.
    'useEffect(() => { setWidth(node.offsetWidth); }, []);',
    // An effect that reads the server without storing anything.
    'useEffect(() => { void fetch(pingUrl); }, []);',
    // `setTimeout` matches the setter shape and is not a state setter.
    'useEffect(() => { const timer = setTimeout(tick, 1000); return () => clearTimeout(timer); }, []);',
    // A fetch and a setter in an event handler, which is where the work goes
    // when it is not a query.
    'async function onSubmit() { const response = await fetch(saveUrl); setSaved(response.ok); }',
    // An effect with no arguments at all.
    'useEffect();',
    // A method named `$get` is only a server read through a member call, and a
    // local variable called `api` that is not the client stays out of the way
    // when nothing sets state.
    'useEffect(() => { api.map.invalidateSize(); }, []);',
  ],
  invalid: [
    {
      code: 'useEffect(() => { fetch(songsUrl).then((response) => setSongs(response)); }, []);',
      errors: [{ messageId: 'serverStateInUseState' }],
    },
    {
      code: 'useEffect(() => { void api.api.runners.$get().then((runners) => setRunners(runners)); }, []);',
      errors: [{ messageId: 'serverStateInUseState' }],
    },
    {
      code: 'React.useEffect(() => { apiClient.songs.list().then(setSongs); setLoaded(true); }, []);',
      errors: [{ messageId: 'serverStateInUseState' }],
    },
    {
      code: 'useEffect(() => { async function load() { const response = await api.api.bars.$post(); setBars(response); } void load(); }, []);',
      errors: [{ messageId: 'serverStateInUseState' }],
    },
  ],
});

// Server state is a front end concern, so the rule reads the file name.
createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-server-state-in-use-state (back end file)',
  rule,
  {
    valid: ['useEffect(() => { fetch(url).then((value) => setSongs(value)); }, []);'],
    invalid: [],
  },
);
