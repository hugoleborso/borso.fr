# Agentic dantotsu frame

Copied from the Theodo Notion page *Template de dantotsu agentique*
(Guilde Future of Software, Dantotsus agentiques), translated to English.
Every dantotsu `/after-task-kaizen` writes is checked against this frame
before it is committed. The six headings below map onto the sections of
`docs/dantotsus/_template.md`; the checkpoints are what each one must
satisfy.

## General checkpoints

- [ ] Very short and readable by a person: short sentences, nothing extra.
- [ ] The template is kept as it is: same headings, no icons, no added sections.
- [ ] The title describes the problem, never the solution.
- [ ] Every proof image is folded away, so the dantotsu stays short.

## User impact

What the user saw against what they should have seen. Maps to *Symptom*.

- [ ] Describes the problem without giving the solution, in the text or the visuals.
- [ ] Visual proof: what the user saw against what they should have seen.
- [ ] Exact numbers, citing who measured them (the first report, the reproduction).

## Causal chain

The sequence of events that led to the error the user saw. Maps to
*Root-cause chain*.

- [ ] Cascading bullets: each point is nested under the one it explains.
- [ ] Reads by adding "Why?" between each point, down to the last.
- [ ] One branch per cause when several causes combine.
- [ ] Each point is a fact that happened, never the absence of a solution ("we did not do X").

## Root cause of occurrence

The technical or business misconception that led the developer to make the
mistake. Maps to the *Root cause* line.

- [ ] Names the real misconception, not a piece of the context.
- [ ] States the fact, without "we did not know": that is implied, and "we" names nobody.
- [ ] Backed: a link to the source documentation or article, with a quote.

## Detection failure causes

Why the defect was not caught earlier. One line per layer that should have
caught it.

## Countermeasure

How the defect was fixed. The commit that fixed it.

## Eradication

What are the similar instances in the tool? How is a regression prevented
and the defect removed once and for all? Did this part already fail before
(a weak point)?

- [ ] Not a list of things to do: describes the mechanism that guarantees the problem never comes back, such as an automated test or a rule in the repository.
- [ ] The mechanism was tried, at least locally: the test or rule fails without the change and passes with it.
- [ ] The similar instances were searched for and listed.
- [ ] Called "eradicated" only if no problem of the same kind can happen again, not only this one.
