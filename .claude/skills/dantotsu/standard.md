# Dantotsu — Radical Quality Improvement (the standard)

This is the canonical Dantotsu standard, kept here verbatim so the
agent's behaviour stays anchored to it. The
[`SKILL.md`](./SKILL.md) summarises and adapts; this file is the
reference.

> **First thing first**
> Watch [the talk](https://youtu.be/OLVyQduiIa0) before facilitating
> a Dantotsu for the first time. The verbal explanation conveys the
> spirit better than text.

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
- Train the team again on the correct pattern and reasoning
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

Coaching gestures: TODO

## Reframes

| Misconception | Reframe |
| --- | --- |
| The developer should be able to do their Dantotsu alone | The point of Dantotsu is to uncover reasoning errors. By definition, the developer who caused the defect doesn't have the knowledge to solve it correctly on their own |
| We're producing "Dantotsu sheets" to document quality issues | The goal is to spark conversations about defects to share tacit knowledge and build expertise |
| A good Dantotsu means filling in all fields and following the checklist | A good Dantotsu means the developer has deepened their understanding of the system |
| I do a Dantotsu when there's a major bug in production | I maintain a regular Dantotsu rhythm to raise the level of play and build a culture of technical excellence |
| An expert is someone who knows all the tidbits of a language/framework | A developer's mastery lies in the quality of their mental models on business modeling, system structure and failure modes |
