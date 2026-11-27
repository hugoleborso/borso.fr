# Dantotsu — Radical Quality Improvement (the standard)

This is the canonical Dantotsu standard, kept here verbatim so the
agent's behaviour stays anchored to it. The
[`SKILL.md`](./SKILL.md) summarises and adapts; this file is the
reference.

## Intent

> Inspire every developer to care about quality by fostering a deep
> understanding of their system — from business modeling to the
> lines of code they write every day.

## Typical mistakes

| Mistake | Consequences |
| --- | --- |
| Letting a developer write a Dantotsu without reviewing it with them | The developer won't be able to spot their own misconceptions and will likely stop doing the exercise, as they won't get much out of it |
| Stopping at just filling out the "Dantotsu form" | Developers will feel it's a waste of time and, to avoid hurting the tech lead's feelings, will say they don't have time for future sessions |
| "It was just a careless mistake" | Dantotsu becomes a bureaucratic activity documenting flaws, which kills the motivation to become a better engineer, in addition to overlooking improvement potential. |
| Using the user story name as the title or a title which doesn't spark curiosity | The piece is only read by the developer and the tech lead, so the learning doesn't spread beyond the team |
| Presenting the issue from a technical rather than a user perspective | The developer doesn't focus on the value their code brings to the end user |
| Investigating only a local bug without checking for similar cases in the codebase | Bugs aren't prevented from happening again elsewhere |
| Limiting the analysis to purely technical aspects (when we should look especially at business misunderstandings) | The developer doesn't improve their business modeling skills and will likely introduce similar defects again |
| Describing the cause as simply "the code that should have been written" | This doesn't build awareness of defect patterns and stays superficial — just replacing one line with another. |
| Describing the cause in overly broad terms (e.g., "Lack of knowledge about iFrame communications" instead of "I thought origin was a URL, but it's a scheme + hostname + port") | Overly vague knowledge gaps don't help the developer connect the dots between what they don't know and the code they write every day. |
| Including lots of unnecessary context | If it's poorly written, it's poorly understood. Allowing wordy explanations misses the opportunity for clarity and sharp thinking. |
| Facilitating Dantotsu like a courtroom where the developer must justify their mistake | Developers will prefer to avoid these sessions |

## Key challenges

- Overcoming developer resistance or ego — helping them acknowledge mistakes without discouraging them
- Finding time despite delivery pressures
- Conducting the analysis when the defect is old

## How-to

### 0. Pick a Defect

To get started, schedule dedicated time slots several times per week
to run a root cause analysis.

Before each session, choose a specific defect to work on.

At the beginning, pick a **simple defect**:
- The gap is obvious
- The developer who introduced the defect is available
- You have the full setup to reproduce the issue and dig into it

A good first example: a crash during validation in a staging
environment.

Once the gesture becomes familiar, you can analyze defects seen in
production and **skip the dedicated slot** by doing it in real time
throughout the day.

### 1. Identify the User-Facing Defect

Add a visual that shows both the problematic situation and the
expected normal outcome.

Some tips:
- Take a screenshot (cmd+shift+4) and annotate the difference vs.
  the expected behavior
- If the bug has already been fixed, you can reproduce it by
  reverting the fix or checking out an earlier commit

Double-check that this faulty behavior isn't still occurring
elsewhere right now.

Confirm that the feature is still in use (if it is not, delete the
code: code that doesn't exist doesn't have bugs, security
vulnerabilities or performance issues)

### 2. Identify the Causal Chain

Start from what the user saw and trace back the sequence of events
inside the system.

Look for the first point where the behavior doesn't match
expectations.

If you need to look at the code of one of your dependencies, do it.

Example:

```
User sees a red notification
→ Because there was a 500 on an API call
→ Because an uncaught exception was thrown
→ Because a DB insert query failed
→ Because a non-nullable field was missing
→ Because the `name` field wasn't filled when saving the entity ← ❌ the faulty line of code
```

In your Dantotsu, include the faulty line of code, and add a comment
describing the event chain

You can include intermediary lines of code if they help understanding
— but keep it minimal (no more than 20 lines).

### 3. Identify the Root Cause of Occurrence

This is the technical or business misconception that led the
developer to write the faulty code.

To find it, try to fill in the blanks: *"The developer thought ___,
but actually ___"*

To validate it's the right root cause, try to answer this question
honestly: *"If the developer had known this, would they have written
correct code on the first try?"*

A common mistake is stopping at *"I wasn't paying attention"* (e.g.
*"I forgot the `name` field"*) → **there's no learning there**.

Instead, dig deeper:
- "When you wrote this line, what did you think was going to happen?"
- "How do you make sure this kind of thing doesn't happen again?"
  *(...imagine you're flying a plane)*
- "What makes this code error-prone or fragile?"
- "Can we connect this to a known gesture or mental model from the
  Theodo Academy?"

### 4. Identify Detection Failure Causes

A detection failure cause is something that prevented the defect
from being caught earlier.

It is a failure in an error detection system, and the reason why
that failure occurred.

Look at the following stages:
- Typing
- Linter
- Functional validation (locally)
- CI
- Code review
- PO/QA validation
- Monitoring (staging and production)

⚠️ Common traps to avoid:
- "There was no test": true, but not very insightful — most defects
  that happen were not tested
- "There was no manual check": same logic, but even worse — manual
  checks don't scale

### 5. Countermeasure

The minimal change (i.e. the fix) that restores the system's
functionality. It confirms the developer fully understood the
problem.

A good countermeasure:
- Cleans up the code
- Simplifies things
- Makes future work easier

A bad one just "adds an if statement"

### 6. Eradication

Identify other parts of the codebase where similar causes might
exist.

Make sure the same type of defect can't be reintroduced or can be
detected earlier by addressing root causes of occurrence and
detection failure causes.

**Examples:**
- Change the code pattern so the mistake is no longer possible
- Configure the linter to catch this type of issue
- Train the team again on the correct pattern and reasoning. In this
  repository that training is a knowledge entry only when it carries
  `triggers:` a hook can match, so it reaches the next person at the
  moment they repeat the mistake rather than waiting to be searched
  (see the ladder in [`SKILL.md`](./SKILL.md#eradication))
- Update the alerting so the issue is visible earlier (e.g. in
  staging)
- Clean up excessive alerts to avoid developer fatigue

If a major refactor or technical change is required, ask for support
(from your EM or principal tech) to negotiate with the client.

The core tool for eradication is to tell the Dantotsu story — walk
through these steps with everyone who might make the same mistake.

### 7. Go Further

Use **Weak Point Management** to track recurring patterns and defect
categories.

In this repository, an entry joins that map through its front matter:
`zone:` is where the defect lived, `weak-point:` names an engaged weak
point from `docs/quality/weak-points.md`, and `recurs:` names the entry it
repeats. `scripts/quality/weak-points.ts` draws the map and the weekly
count from those fields, and `scripts/quality/check-dantotsu-front-matter.ts`
refuses an entry that leaves them unusable. The *Front matter* section of
[`SKILL.md`](./SKILL.md#front-matter) gives the rules for each field.

## Reframes

| Misconception | Reframe |
| --- | --- |
| The developer should be able to do their Dantotsu alone | The point of Dantotsu is to uncover reasoning errors. By definition, the developer who caused the defect doesn't have the knowledge to solve it correctly on their own |
| We're producing "Dantotsu sheets" to document quality issues | The goal is to spark conversations about defects to share tacit knowledge and build expertise |
| A good Dantotsu means filling in all fields and following the checklist | A good Dantotsu means the developer has deepened their understanding of the system |
| I do a Dantotsu when there's a major bug in production | I maintain a regular Dantotsu rhythm to raise the level of play and build a culture of technical excellence |
| An expert is someone who knows all the tidbits of a language/framework | A developer's mastery lies in the quality of their mental models on business modeling, system structure and failure modes |

## Reaching a root cause: the 4M

The causal chain does not stop at the faulty line. Below it, the chain goes
on with the events that produced the line, such as the commit that wrote it and
the input that commit was built from. Keep asking why until the answer is a
work condition someone can change. The 4M
break down the conditions in which someone produces value. A why that lands on
one of them has reached a root cause.

- **Man:** did the person know the standard? Were they trained on it?
- **Machine:** the tools used, such as the codebase, its blueprints, its
  gates and its examples.
- **Method:** the standard or the process followed.
- **Material:** the input from the previous workstation. For a developer it
  is the user story, the spec, the mockup and its validation steps.

A why that lands on a person's attention ("forgot", "did not notice") has not
reached one. Ask why again, until a Man, Machine, Method or Material cause
names what made the mistake easy. Tag each root cause with its M.

## Lessons from the simulators

The Theodo Academy simulators grade sample entries section by section. What
they teach, condensed:

### User impact

- Someone with no project context understands the defect from it. A sentence
  that needs the feature's context to read the screenshot fails.
- It shows the expected result next to the broken one, unless the expected
  result is common knowledge (an invoice, a login page).
- It says which users are affected, and which are not.

### Causal chain

- It starts at what the user saw and descends, event by event, to the faulty
  line, quoted with a comment on each step.
- Only the chain. Context the reader does not need distracts from the root
  cause and leads to the wrong countermeasure.
- A code block that explains why the faulty line was written, such as a type
  declaration, is not an event of the chain. It belongs to the causes.
- What the IDE or the linter showed is not an event of the system. It belongs
  to detection.
- A point that states a missing solution ("we did not do X") is not an event.

### Root cause of occurrence

- It is the misconception of the person who wrote the line, as *thought ___,
  actually ___*. Even months later, it is the belief we can be nearly sure
  they held.
- It is precise. "Lack of knowledge about iframes" fails. "Thought an origin
  was a URL, actually it is a scheme, a host and a port" passes.
- Typing is not a root cause. It only detects mistakes early, so it belongs
  in detection.
- A carelessness error teaches nothing. Look for what made it easy, such as
  a manual pagination with many variables to get right.
- It may name a misleading material, such as an unsafe example in a
  framework's documentation, or a browser API that hands out a URL and an
  origin as the same type.

### Detection failure causes

- Blaming someone's carefulness ("the PO did not test that value") teaches
  nothing and fails.
- A description of what happened ("we had to wait for QA") is not a cause.
- Good causes are systemic: tests run in UTC on CI and in Paris time on a
  laptop, a type assertion that silenced typing in the code and in its test,
  a lint rule installed but not configured.

### Countermeasure

- A good one removes the misconception and improves the code, such as a
  parsed payload instead of a type assertion, or a named `isTrustedOrigin`
  check instead of a string comparison.
- A fix that works without addressing the root cause fails, such as adding
  the missing dependency to an effect that should not exist.

### Eradication

- It repairs the failing systems: a lint rule, an environment variable set in
  every environment, every other occurrence replaced.
- An end-to-end test or a new written standard alone fails. A costly test and
  a document nobody reads add bulk without changing the system.
- Sharing the knowledge alone is acceptable for a genuine one-off. Watch the
  weak point if it comes back.
- A fix too large for the team is escalated, not dropped.

## The agentic template's checkpoints

The Future of Software guild's template for dantotsus written with an agent
adds these checkpoints to the standard.

- **General:** hyper concise and readable by a person, short sentences,
  nothing superfluous. The template is kept as is, with the same headings and
  no added section. The title describes the problem, not the solution. Proof
  images sit in collapsed blocks to keep the entry short.
- **User impact:** describes the problem without the solution, in the text
  and the visuals. Visual proof of what the user saw against what they should
  have seen. Exact numbers, citing who measured them.
- **Causal chain:** cascading bullets, each nested under the point it
  explains. It reads with "Why?" between each point. One branch per cause when
  several combine. Each point is a fact that happened, never the absence of a
  solution. Ideally a causal diagram.
- **Root cause of occurrence:** names the real misconception, not an element
  of the context. States the fact, without "we did not know", which is
  implicit and names nobody. Sourced, with a link, a quotation and a capture.
- **Eradication:** not a to-do list, but the mechanism that guarantees the
  problem never returns, such as an automated test in the repository. The
  mechanism was tried, at least locally. Similar instances were searched and
  listed. "Eradicated" only if no problem of the same type can recur, not just
  this one.
