import { createRuleTester } from './rule-tester.js';
import rule from './no-components-outside-buckets.js';

const plainComponent = 'export function SongLinkAdder() { return <div />; }';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/site/src/routes/catalog/SongLinkAdder.tsx').run(
  'no-components-outside-buckets',
  rule,
  {
    valid: [
      {
        filename: 'apps/pragma/site/src/routes/catalog/CatalogPage.tsx',
        code: "import { CatalogGrid } from '../../components/organisms/CatalogGrid';\nexport function CatalogPage() { return <CatalogGrid />; }",
      },
      {
        filename: 'apps/last-loop-lepin/site/src/routes/AdminPage.tsx',
        code: 'export function AdminPage() { return <main />; }',
      },
      {
        filename: 'apps/last-loop-lepin/site/src/routes/NotFoundPage.tsx',
        code: 'export function NotFoundPage() { return <main />; }',
      },
      {
        filename: 'apps/pragma/site/src/components/molecules/MemberChip.tsx',
        code: plainComponent,
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/catalog-page.core.ts',
        code: 'export const isMissing = (song) => song === null;',
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/chart-kind.utils.ts',
        code: 'export const CHART_KINDS = [];',
      },
      {
        filename: 'apps/pragma/site/src/routes/members/MemberEditForm.test.tsx',
        code: 'export function MemberEditForm() { return <form />; }',
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/song-icons.tsx',
        code: 'const icon = <svg />;\nexport const ICONS = { icon };',
      },
      {
        filename: 'apps/pragma/site/src/routes/sessions/session-view.tsx',
        code: 'const markup = <div />;\nexport type ConcertReadViewProps = { id: string };\nexport interface Member { id: string }',
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/entries.tsx',
        code: "export { SongEditForm } from '../../components/organisms/SongEditForm';",
      },
      {
        filename: 'apps/borsouvertures/site/routes/TrainerPage.tsx',
        code: 'export function TrainerPage() { return <main />; }',
      },
      { filename: 'apps/pragma/site/src/App.tsx', code: plainComponent },
      { filename: 'apps/pragma/api/src/songs/songs.controller.ts', code: 'export const x = 1;' },
    ],
    invalid: [
      {
        filename: 'apps/pragma/site/src/routes/catalog/SongLinkAdder.tsx',
        code: "import { Button } from '../../components/atoms/Button';\nimport { Input } from '../../components/atoms/Input';\nexport function SongLinkAdder() { return <div><Input /><Button /></div>; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'SongLinkAdder', bucket: 'molecules' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/sessions/ConcertReadView.tsx',
        code: "import { Card } from '../../components/atoms/Card';\nimport { MemberChip } from '../../components/molecules/MemberChip';\nexport function ConcertReadView() { return <Card><MemberChip /></Card>; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'ConcertReadView', bucket: 'organisms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/bars/BarForm.tsx',
        code: "import { useState } from 'react';\nexport function BarForm() { const [name, setName] = useState(''); return <form>{name}</form>; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'BarForm', bucket: 'organisms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/SongDeleteAction.tsx',
        code: "import { useMutation } from '@tanstack/react-query';\nexport function SongDeleteAction() { const remove = useMutation({}); return <button onClick={remove.mutate} />; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'SongDeleteAction', bucket: 'organisms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/SongChordPreview.tsx',
        code: 'export function SongChordPreview() { return <pre />; }',
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'SongChordPreview', bucket: 'atoms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/Login.tsx',
        code: "import { Card } from '../components/atoms/Card';\nexport function Login() { return <Card />; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'Login', bucket: 'molecules' },
          },
        ],
      },
      {
        filename: 'apps/borsouvertures/site/src/routes/OpeningTrainerRoute.tsx',
        code: "import { TopBar } from '@/components/organisms/TopBar';\nexport function OpeningTrainerRoute() { return <TopBar />; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'OpeningTrainerRoute', bucket: 'organisms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/members/MemberEditForm.tsx',
        code: 'export default function MemberEditForm() { return <form />; }',
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'MemberEditForm', bucket: 'atoms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/SongNotesFields.tsx',
        code: 'export const SongNotesFields = () => <fieldset />;',
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'SongNotesFields', bucket: 'atoms' },
          },
        ],
      },
      {
        filename: 'apps/borsouvertures/site/routes/TrainerScreens.tsx',
        code: "import { SelectionScreen } from '@/components/organisms/SelectionScreen';\nexport function TrainerScreens() { return <SelectionScreen />; }",
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'TrainerScreens', bucket: 'organisms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/catalog/SongExternalLinks.tsx',
        code: 'export function SongExternalLinks() { return <><a /></>; }',
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'SongExternalLinks', bucket: 'atoms' },
          },
        ],
      },
      {
        filename: 'apps/pragma/site/src/routes/sessions/PracticeReadView.tsx',
        code: 'export function PracticeReadView() { return <div />; }\nexport function PracticeHeader() { return <h1 />; }',
        errors: [
          {
            messageId: 'componentOutsideBucket',
            data: { component: 'PracticeReadView', bucket: 'atoms' },
          },
        ],
      },
    ],
  },
);
