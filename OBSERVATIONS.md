# Session Observations — Participant P027

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

The AI handled the full feature implementation end-to-end — schema, routes, atomic transactions, and integration tests — with minimal back-and-forth, which made the session feel very productive.

## What slowed you down?

Switching branches mid-session (from `master` to `condition-b`) caused merge conflicts in `package.json` and `package-lock.json` that required a few extra rounds to resolve correctly.

## How did you handle git commits today?

Told the AI.

## Anything surprising?

The AI proactively identified and fixed pre-existing anti-patterns (hardcoded JWT secret, password leakage in responses, missing `next(err)` forwarding) without being explicitly asked, which was unexpected but valuable.