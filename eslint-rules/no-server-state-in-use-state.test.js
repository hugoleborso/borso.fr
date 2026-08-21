import { createRuleTester } from './rule-tester.js';
import rule from './no-server-state-in-use-state.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-server-state-in-use-state', rule, {
  valid: [
    'const { data } = useQuery({ queryKey: ["songs"], queryFn: () => api.api.songs.$get() });',
    'useEffect(() => { setWidth(node.offsetWidth); }, []);',
    'useEffect(() => { void fetch(pingUrl); }, []);',
    'useEffect(() => { const timer = setTimeout(tick, 1000); return () => clearTimeout(timer); }, []);',
    'async function onSubmit() { const response = await fetch(saveUrl); setSaved(response.ok); }',
    'useEffect();',
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

createRuleTester('apps/pragma/api/src/songs/songs.service.ts', { jsx: false }).run(
  'no-server-state-in-use-state (back end file)',
  rule,
  {
    valid: ['useEffect(() => { fetch(url).then((value) => setSongs(value)); }, []);'],
    invalid: [],
  },
);
