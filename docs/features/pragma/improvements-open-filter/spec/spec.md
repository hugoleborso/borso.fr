# The improvements list opens on what is still to do

## Goal

A member who opens Improvements sees only the items still to do. Closed items stay one tap away.

## Problem

The list showed every improvement, shipped ones included. It grows with every release.

## Behaviour

1. A new filter pill, "Ouvertes" in French and "Open" in English, comes first and is selected when the page opens.
2. Open shows the items whose status is idea, planned or building. Shipped and declined items are hidden.
3. Its count is the number of open items.
4. Tapping "Toutes" or "livrée" shows the shipped items again.
5. The pill row fits a 375 px screen and scrolls sideways, as before.

## Acceptance

- On `/improvements`, a shipped item is absent until "livrée" or "Toutes" is tapped.

## Out of scope

The API, which still returns every improvement.
