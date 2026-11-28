# Pause the sign-up follow-up questions

The operator asked to temporarily remove, from pragma's public concert
sign-up, the questions asking who a fan comes for and which song they want,
to make signing up simpler.

## What a fan sees

1. On the public concert page at `/`, "Je serai là !" (English: "I'll be
   there!") opens a sheet with only a first name and an email field.
2. After a valid sign-up and the opening animation, no sheet asks "Tu viens
   soutenir qui dans le groupe ?" or "Un morceau que tu rêves de nous
   entendre jouer ?". The ticket shows "Inscrit·e" (English: "Signed up")
   right away.
3. "Un·e ami·e" (English: "Sign up a friend") follows the same path: first
   name and email, then the ticket, with no follow-up questions.
4. At 375 px wide the page never scrolls sideways.

## Out of scope

- The amend endpoint and answers already stored stay as they are.
- The follow-up sheet stays in the code behind `IS_FOLLOW_UP_ASKED` in
  `ConcertSignUpCard.tsx`, so turning it back on is a one-line change.
