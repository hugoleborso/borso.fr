# Blueprint: React front end

Follow the steps below to build the `site/` half of an application. The
reference implementation is `apps/pragma/site`, so open it beside this
document.

## Dependencies

```
react react-dom react-router-dom
@tanstack/react-query @tanstack/react-form @tanstack/react-table
hono                              for the client type only
tailwindcss @tailwindcss/vite
clsx class-variance-authority
i18next react-i18next
```

Development dependencies are `vite`, `@vitejs/plugin-react`, `vitest`,
`@vitest/coverage-v8`, `jsdom`, `@testing-library/react`,
`@testing-library/user-event`, and `@stryker-mutator/core`.

## Folder layout

```
site/src/
  main.tsx                    mounts the providers
  App.tsx                     routes only
  components/
    atoms/                    Button, Input, Badge, Icon, Card
    molecules/                SearchBar, MemberChip, LanguageSwitcher
    organisms/                CatalogGrid, Leaderboard, AppShell
  routes/<route>/             one folder per route
  lib/
    api.ts                    the Hono client
    query-client.ts           the TanStack Query client
    queries/<domain>.ts       keys and hooks, one module per domain
    *.utils.ts                pure helpers with full coverage
  i18n/                       catalogues and initialisation
  styles/tokens.css           the only CSS file
```

[05. Front end architecture](../standards/05-frontend-architecture.md) explains
how to choose between the three component folders.

## Step 1: mount the providers

`main.tsx` holds the provider tree and nothing else, and the order is the query
client, then the router, then the i18next provider when the application needs
one.

```tsx
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

Configure the query client in `lib/query-client.ts` rather than inline, so the
retry and stale time settings are in one reviewable place.

## Step 2: wire the Hono client

Copy the shape of `apps/pragma/site/src/lib/api.ts`, which imports the router
type from the API and builds one `hc` client. Never call `fetch` against your
own API, and never write a response type by hand. See
[06. Data fetching](../standards/06-data-fetching.md).

## Step 3: write the query module before the component

For each domain, write `lib/queries/<domain>.ts` holding the key factory and
the hooks, and only then write the component that calls them. Writing the
component first tends to produce inline keys that later drift.

## Step 4: build the atoms you need, and no more

Add an atom when a second component needs the same primitive, and not before.
An atom created for one caller is a molecule that has not admitted it yet.

## Step 5: set up i18n before writing any visible text

Adding i18n after the fact means rewriting every component, so create `en.json`,
`fr.json`, and the typed declaration first. See
[09. Internationalisation](../standards/09-i18n.md).

## Step 6: write the pure helpers as you go

Whenever a component needs a decision, write the decision as a pure function in
a sibling `.core.ts` file with its test, and then call it from the component.
Extracting afterwards is more work, and it usually does not happen.

## Checks before you call it done

Run `pnpm --filter @borso-app/<app> run lint`, `typecheck`, `test`, and
`test:mutation`, and then drive the application at 375 pixels and at 1280
pixels with the agentic browser check described in
[the browser testing blueprint](./agentic-browser-testing.md).
