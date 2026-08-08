# Blueprints

A blueprint tells you how to build a new thing in this repository from nothing.
It gives the folder layout, the dependency list, the first files to write, and
the checks that tell you the thing works.

The idea and the shape come from
[theodo-group/theodo-blueprints](https://github.com/theodo-group/theodo-blueprints),
which publishes one blueprint per stack so a team starts from a known good
setup instead of a blank folder.

A blueprint differs from a [standard](../standards/README.md), because a
standard constrains code that already exists and a blueprint starts code that
does not exist yet. Follow a blueprint once, and follow the standards forever
after.

| Blueprint                                               | Use it when                                          |
| ------------------------------------------------------- | ---------------------------------------------------- |
| [New application](./new-application.md)                 | You are adding a new `apps/<slug>` folder            |
| [React front end](./react-frontend.md)                  | You are building the `site/` half of an application  |
| [Hono back end](./hono-backend.md)                      | You are building the `api/` half of an application   |
| [Agentic browser testing](./agentic-browser-testing.md) | You want a browser to exercise a running application |

## Keeping a blueprint honest

A blueprint goes stale faster than a standard, because it names versions and
commands. Two habits keep it usable.

Point at a real file rather than repeating its contents, e.g., say that
`apps/pragma/site/src/lib/api.ts` is the reference implementation instead of
copying the file into the blueprint.

Run the blueprint yourself the next time you add something, and fix whatever
did not work while you still remember it.
