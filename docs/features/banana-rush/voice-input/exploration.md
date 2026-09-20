# Voice input for Banana Rush, and what several voices would actually buy

Written 2026-09-20, after the game itself was finished. This is an
exploration, not a decision. One small piece of it shipped, and the part
that needs a person to choose is at the bottom.

## The thing that has to be said first

A bid in this game is secret. Speaking it out loud, in a room with the
people you are bidding against, is not a technical problem with a
technical answer. It is the game being given away.

Every voice design below either accepts that and changes the game, or
works around it. It is worth being blunt about this, because "add voice
input" sounds like a feature and is really a rules change.

## What "several voices" can mean

The phrase covers four different problems, and they are not equally hard.

| Problem | What it means | How hard |
| --- | --- | --- |
| Rejecting other voices | Your phone should hear you and not the person beside you | Easy, and not a machine learning problem at all |
| Separating voices | Splitting one recording into "speaker A said this, speaker B said that", without knowing who A and B are | Available as a paid service |
| Naming voices | Deciding that speaker A *is Hugo*, from a voiceprint taken earlier | Needs enrolment, and is the expensive one |
| Overlapping voices | Several people talking at the same moment | The hardest, and the one everybody underestimates |

Most of what people picture when they say "multi voice" is the third row.
Most of what a game like this actually needs is the first.

## What was measured

Everything in this table came from a page that was fetched or a command
that was run on 2026-09-20. Anything not confirmed is in the gaps section
below, and is not in this table.

| Option | Transcribes | Separates | Names | Runs | Cost as published |
| --- | --- | --- | --- | --- | --- |
| Web Speech API | yes | no | no | The browser, but Chrome sends the audio to a server | none |
| Amazon Transcribe streaming | yes | yes | no | AWS, available in eu-west-3 | $0.01 per minute |
| Amazon Polly | speaks rather than listens | n/a | n/a | AWS, eu-west-3 | not checked |

Sources and commands:

- Browser support: [caniuse.com/speech-recognition](https://caniuse.com/speech-recognition).
  It reports 87.89% global support, partial support on Safari for iOS
  from 14.5, partial on Chrome for Android, partial on Safari for desktop
  from 14.1, partial on Chrome for desktop from 25, and disabled by
  default on Firefox. Partial is the only kind of support this API has
  anywhere; it is an unofficial specification.
- Where the audio goes: MDN's [SpeechRecognition page](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
  states "On some browsers, like Chrome, using Speech Recognition on a
  web page involves a server-based recognition engine. Your audio is sent
  to a web service for recognition processing, so it won't work offline."
  The same page states the grammar concept "has been removed from the Web
  Speech API", so a recogniser cannot be constrained to numbers and the
  constraining has to happen after it answers.
- Transcribe pricing: [aws.amazon.com/transcribe/pricing](https://aws.amazon.com/transcribe/pricing/)
  gives $0.01 per minute for standard streaming, billed in one-second
  increments with no minimum, a free tier of 60 minutes per month for 12
  months, and states that the price "includes features such as custom
  vocabularies, vocabulary filtering, speaker diarization, and language
  identification", so separating speakers costs nothing extra.
- Transcribe is reachable in eu-west-3: `aws transcribe list-vocabularies --region eu-west-3`
  answered normally rather than with an endpoint error.
- Polly has French voices in eu-west-3: `aws polly describe-voices --region eu-west-3 --language-code fr-FR`
  returned four, of which Léa and Rémi support the neural engine.
- This sandbox's Chromium defines both `SpeechRecognition` and
  `webkitSpeechRecognition` as functions, and `speechSynthesis` as an
  object.

## What shipped

The smallest useful piece, and the one that needs nobody's permission:
**a press and hold microphone button on the bid pad**, on your own phone,
for your own bid.

It does not submit. It fills the field, and you still press *Miser*. A
recogniser that mishears ninety as nineteen must not be able to spend
your bananas.

Press and hold is the whole answer to the first row of the table above.
The microphone is open only while a thumb is down, which is too short and
too deliberate a window to catch the person beside you. No voiceprint, no
enrolment, no second service, no cost.

Two pure modules carry the awkward parts, so neither needs a microphone
to be tested:

- `spoken-number.core.ts` turns what was heard into a number. French
  numbers are not the sum of their words: `quatre-vingt-dix` is ninety,
  not four plus twenty plus ten, and `cent quatre-vingt` is a hundred and
  eighty, not a hundred and twenty four. Both are tests.
- `speech-transcript.core.ts` reads the array-like object the browser
  hands back, including the gaps a real recogniser leaves in it.

Because grammars were removed from the specification, constraining the
answer to a number is exactly this parser's job and cannot be pushed onto
the browser.

## The designs that need several voices, and what each costs

### One phone each, press and hold

What shipped. Several voices are a nuisance to be rejected, and holding a
button rejects them. Secrecy survives because you can whisper.

### One phone in the middle, taken in turns

The phone is the board. Each player picks it up and whispers. Naming the
speaker is free, because the application asked a named player to speak
and knows who it asked. No voiceprint needed for this either.

Cost: turn taking destroys simultaneity, and simultaneity is the point of
the round.

### One phone in the middle, everybody at once

Everybody says their number on three. This is the overlapping voices row,
which is the hardest case and the one diarization handles worst. It also
abandons secrecy completely, which makes it a different game rather than
this one.

### The phone as scorekeeper for a game played on paper

This is the one worth thinking about, because it answers the reason the
application exists. The specification's own *Why* says the game "needs
somebody to collect the numbers, do the arithmetic and keep score, and
that person cannot really play". Six phones solve that. So does one phone
in the middle that listens while people play the way they always have,
hears "Hugo trente, Zoé vingt-cinq", and does the arithmetic.

This is the design where naming voices earns its cost, and even here
there is a cheaper version: the application can call the roll rather than
recognise anybody. "Hugo?" then listen. Identity comes from having asked.

**Recommendation: if this is the direction, build the roll-call version
first and find out whether anybody misses real speaker identification.**
It needs no new service, no enrolment step in the lobby, and no voiceprint
stored anywhere, which is also the answer that keeps a party game free of
a privacy policy.

## What was not verified

The research into speaker identification stopped early when the session
hit a rate limit. These are open, and none of them should be repeated as
fact until somebody checks:

- The exact parameters, speaker maximum and label stability of Transcribe
  streaming diarization. The documentation page did not render when
  fetched.
- Transcribe pricing specific to eu-west-3. The pricing page lists rates
  per region behind a selector and the figure above is the one it shows
  by default.
- Whether Amazon Connect Voice ID exists as a standalone service, whether
  it is offered in eu-west-3, and what it costs.
- Whether Azure's Speaker Recognition and Google's diarization are still
  offered, and on what terms.
- Whether a speech-to-text or speaker-embedding model can realistically
  run in a phone browser, and at what download size and licence.
- Whether the Web Speech API returns a result in this sandbox's Chromium.
  Only the presence of the constructor was confirmed. A Chromium built
  without the vendor's private keys commonly cannot reach the recognition
  service, so the button was verified to render and to be wired, not to
  transcribe. On a real phone it either works or the button does not
  appear, which is the same code path either way.

## What needs deciding

1. Is the scorekeeper design worth building at all, or is one phone each
   the whole product?
2. If it is worth building, is the roll-call version enough, or is real
   speaker identification wanted from the start? The second answer means
   a new service, a voiceprint in the lobby, and an ADR, because storing
   something derived from a person's voice is not a small decision for a
   game that currently asks for nothing but a nickname.
